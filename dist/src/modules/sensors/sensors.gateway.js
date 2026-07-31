"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
var __param = (this && this.__param) || function (paramIndex, decorator) {
    return function (target, key) { decorator(target, key, paramIndex); }
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
var SensorsGateway_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.SensorsGateway = void 0;
const websockets_1 = require("@nestjs/websockets");
const common_1 = require("@nestjs/common");
const sensors_service_1 = require("./sensors.service");
const create_sensor_dto_1 = require("./dto/create-sensor.dto");
const class_validator_1 = require("class-validator");
const class_transformer_1 = require("class-transformer");
const ws_1 = require("ws");
const ws_2 = __importDefault(require("ws"));
const ws_auth_guard_1 = require("../auth/guards/ws-auth.guard");
const iot_service_1 = require("../iot/iot.service");
const jwt_1 = require("@nestjs/jwt");
const device_time_service_1 = require("./services/device-time.service");
const device_connection_registry_1 = require("../../common/device-connection.registry");
function getClientInfo(client) {
    const device = client.device;
    if (device) {
        return {
            tenantId: device.tenantId,
            blowerId: device.blowerId,
            blowerConfigId: device.blowerConfigId,
        };
    }
    const user = client.user;
    if (user) {
        return { tenantId: user.tenantId };
    }
    return undefined;
}
const DEVICE_REVALIDATION_INTERVAL_MS = 5 * 60 * 1000;
let SensorsGateway = SensorsGateway_1 = class SensorsGateway {
    sensorsService;
    iotService;
    jwtService;
    deviceTimeService;
    connectionRegistry;
    logger = new common_1.Logger(SensorsGateway_1.name);
    server;
    heartbeatTimers = new Map();
    revalidationTimers = new Map();
    ensureClientInfo(client) {
        let info = this.connectionRegistry.clients.get(client);
        if (!info) {
            info = getClientInfo(client);
            if (info) {
                this.connectionRegistry.register(client, info);
            }
        }
        return info;
    }
    constructor(sensorsService, iotService, jwtService, deviceTimeService, connectionRegistry) {
        this.sensorsService = sensorsService;
        this.iotService = iotService;
        this.jwtService = jwtService;
        this.deviceTimeService = deviceTimeService;
        this.connectionRegistry = connectionRegistry;
    }
    broadcastToUsers(tenantId, message, exclude) {
        this.connectionRegistry.broadcastToUsers(tenantId, message, exclude);
    }
    getOnlineDevices(tenantId) {
        return this.connectionRegistry.getOnlineDevices(tenantId);
    }
    afterInit(server) {
        server.on('connection', (client, request) => {
            client.__upgradeReq = request;
        });
    }
    startHeartbeat(client) {
        this.clearHeartbeat(client);
        const timer = setTimeout(() => {
            this.logger.warn(`Client missed pong, closing connection`);
            client.terminate();
        }, 35000);
        this.heartbeatTimers.set(client, timer);
        if (client.readyState === ws_2.default.OPEN) {
            client.ping();
        }
    }
    clearHeartbeat(client) {
        const timer = this.heartbeatTimers.get(client);
        if (timer) {
            clearTimeout(timer);
            this.heartbeatTimers.delete(client);
        }
    }
    startDeviceRevalidation(client) {
        const device = client.device;
        if (!device?.deviceKey)
            return;
        const timer = setInterval(async () => {
            try {
                const valid = await this.iotService.validateDeviceKey(device.deviceKey);
                if (!valid) {
                    this.logger.warn(`Device key revoked mid-session, closing connection`);
                    client.send(JSON.stringify({
                        event: 'auth_error',
                        data: { reason: 'key_revoked' },
                    }));
                    client.close(4001, 'Device key revoked');
                    this.clearDeviceRevalidation(client);
                }
            }
            catch (e) {
                this.logger.warn(`Device revalidation error: ${e}`);
            }
        }, DEVICE_REVALIDATION_INTERVAL_MS);
        this.revalidationTimers.set(client, timer);
    }
    clearDeviceRevalidation(client) {
        const timer = this.revalidationTimers.get(client);
        if (timer) {
            clearInterval(timer);
            this.revalidationTimers.delete(client);
        }
    }
    async handleConnection(client) {
        const req = client.__upgradeReq;
        if (req) {
            try {
                const url = new URL(req.url || '/', `http://${req.headers.host || 'localhost'}`);
                const token = url.searchParams.get('token');
                const deviceKey = (url.searchParams.get('key') ||
                    req.headers['key']);
                if (deviceKey) {
                    const device = await this.iotService.validateDeviceKey(deviceKey);
                    if (device) {
                        client.device = { ...device, deviceKey };
                    }
                    else {
                        this.logger.warn(`Device key inválido en conexión, cerrando`);
                        client.close(4001, 'Device key revoked');
                        return;
                    }
                }
                else if (token) {
                    try {
                        const payload = await this.jwtService.verifyAsync(token);
                        client.user = payload;
                    }
                    catch {
                        this.logger.warn(`Token inválido en conexión, cerrando`);
                        client.close(4001, 'Invalid token');
                        return;
                    }
                }
            }
            catch (e) {
                this.logger.warn(`Connection auth error: ${e}`);
                client.close(4001, 'Connection failed');
                return;
            }
        }
        const info = getClientInfo(client);
        if (info) {
            this.connectionRegistry.register(client, info);
        }
        client.on('pong', () => {
            this.clearHeartbeat(client);
            this.startHeartbeat(client);
        });
        this.startHeartbeat(client);
        this.startDeviceRevalidation(client);
        const device = client.device;
        const user = client.user;
        if (device) {
            this.broadcastToUsers(info.tenantId, {
                event: 'device_online',
                data: {
                    blowerId: info.blowerId,
                    blowerConfigId: info.blowerConfigId,
                },
            });
            try {
                const config = await this.sensorsService.getBlowerConfigById(info.blowerConfigId);
                if (config && (config.readIntervalMs || config.scaleFactor)) {
                    client.send(JSON.stringify({
                        event: 'device_config_update',
                        data: {
                            blowerId: info.blowerId,
                            readIntervalMs: config.readIntervalMs,
                            scaleFactor: config.scaleFactor,
                        },
                    }));
                }
            }
            catch (e) {
                this.logger.warn(`Failed to send device config on connect: ${e}`);
            }
        }
        if (user) {
            const onlineDevices = this.getOnlineDevices(user.tenantId);
            if (onlineDevices.length > 0) {
                client.send(JSON.stringify({
                    event: 'devices_online',
                    data: { devices: onlineDevices },
                }));
            }
        }
    }
    handleDisconnect(client) {
        this.clearHeartbeat(client);
        this.clearDeviceRevalidation(client);
        const info = this.connectionRegistry.clients.get(client);
        if (info?.blowerId) {
            this.broadcastToUsers(info.tenantId, {
                event: 'device_offline',
                data: { blowerId: info.blowerId },
            }, client);
        }
        this.connectionRegistry.unregister(client);
    }
    async handleRegisterBlower(data, client) {
        try {
            const clientInfo = this.ensureClientInfo(client);
            const tenantId = data.tenantId || clientInfo?.tenantId;
            const blowerId = data.blowerId || clientInfo?.blowerId;
            if (!tenantId || !blowerId) {
                return { status: 'error', message: 'tenantId y blowerId requeridos' };
            }
            const config = await this.sensorsService.registerBlower(tenantId, blowerId);
            if (clientInfo) {
                clientInfo.blowerConfigId = config.id;
                clientInfo.blowerId = blowerId;
            }
            client.send(JSON.stringify({
                event: 'blower_registered',
                data: {
                    blowerConfigId: config.id,
                    currentThreshold: config.currentThreshold,
                },
            }));
        }
        catch (error) {
            this.logger.error(`Registration error: ${error instanceof Error ? error.message : 'Unknown'}`);
        }
    }
    async handlePressureReading(data, client) {
        try {
            const clientInfo = this.ensureClientInfo(client);
            const enriched = {
                psi: data.psi ?? 0,
                blowerConfigId: data.blowerConfigId || clientInfo?.blowerConfigId,
                tenantId: data.tenantId || clientInfo?.tenantId,
                blowerId: data.blowerId || clientInfo?.blowerId,
                deviceTs: data.ts,
                deviceTime: data.ts !== undefined && clientInfo?.blowerConfigId
                    ? this.deviceTimeService.toRealTime(clientInfo.blowerConfigId, data.ts)
                    : undefined,
            };
            const dto = (0, class_transformer_1.plainToInstance)(create_sensor_dto_1.CreateSensorDto, enriched);
            const errors = await (0, class_validator_1.validate)(dto);
            if (errors.length > 0) {
                this.logger.warn(`Invalid pressure_reading data: ${errors.map((e) => Object.values(e.constraints || {}).join(', ')).join('; ')}`);
                return;
            }
            if (!enriched.blowerConfigId && enriched.tenantId && enriched.blowerId) {
                const config = await this.sensorsService.registerBlower(enriched.tenantId, enriched.blowerId);
                enriched.blowerConfigId = config.id;
                if (clientInfo) {
                    clientInfo.blowerConfigId = config.id;
                    clientInfo.blowerId = enriched.blowerId;
                }
            }
            await this.sensorsService.createReading(enriched);
            for (const [c, info] of this.connectionRegistry.clients) {
                if (c.readyState === ws_2.default.OPEN &&
                    info.tenantId === enriched.tenantId) {
                    c.send(JSON.stringify({
                        event: 'pressure_reading',
                        data: enriched,
                    }));
                }
            }
            if (client.readyState === ws_2.default.OPEN) {
                client.send(JSON.stringify({
                    event: 'reading_ack',
                    data: { ok: true, ts: Date.now() },
                }));
            }
            return { ok: true };
        }
        catch (error) {
            this.logger.error(`Pressure reading error: ${error instanceof Error ? error.message : 'Unknown'}`);
        }
    }
    async handleBatchReadings(data, client) {
        try {
            const clientInfo = this.ensureClientInfo(client);
            if (!clientInfo?.blowerConfigId || !clientInfo?.tenantId)
                return;
            const last = data.readings[data.readings.length - 1];
            if (last) {
                await this.sensorsService.createReading({
                    psi: last.psi,
                    blowerId: clientInfo.blowerId,
                    blowerConfigId: clientInfo.blowerConfigId,
                    tenantId: clientInfo.tenantId,
                    deviceTs: last.ts,
                    deviceTime: last.ts !== undefined
                        ? this.deviceTimeService.toRealTime(clientInfo.blowerConfigId, last.ts)
                        : undefined,
                });
                for (const [c, info] of this.connectionRegistry.clients) {
                    if (c.readyState === ws_2.default.OPEN &&
                        info.tenantId === clientInfo.tenantId &&
                        !info.blowerId) {
                        c.send(JSON.stringify({
                            event: 'pressure_reading',
                            data: {
                                psi: last.psi,
                                blowerId: clientInfo.blowerId,
                                blowerConfigId: clientInfo.blowerConfigId,
                                tenantId: clientInfo.tenantId,
                                deviceTs: last.ts,
                            },
                        }));
                    }
                }
            }
            if (client.readyState === ws_2.default.OPEN) {
                client.send(JSON.stringify({
                    event: 'batch_ack',
                    data: { ok: true, count: data.readings.length, ts: Date.now() },
                }));
            }
        }
        catch (error) {
            this.logger.error(`Batch readings error: ${error instanceof Error ? error.message : 'Unknown'}`);
        }
    }
    async handleSetNewThreshold(data, client) {
        const clientInfo = this.ensureClientInfo(client);
        const blowerId = data.blowerId || clientInfo?.blowerId;
        const tenantId = clientInfo?.tenantId;
        if (!blowerId || !tenantId) {
            return { status: 'error', message: 'blowerId requerido' };
        }
        await this.sensorsService.updateThreshold(tenantId, blowerId, data.threshold);
        for (const [c, info] of this.connectionRegistry.clients) {
            if (c.readyState === ws_2.default.OPEN && info.tenantId === tenantId) {
                c.send(JSON.stringify({
                    event: 'update_threshold',
                    data: { threshold: data.threshold, blowerId },
                }));
            }
        }
        return { status: 'success', threshold: data.threshold, blowerId };
    }
    async handleGetThreshold(data, client) {
        const clientInfo = this.ensureClientInfo(client);
        const tenantId = clientInfo?.tenantId;
        const blowerId = data?.blowerId || clientInfo?.blowerId;
        if (!tenantId) {
            return { status: 'error', message: 'tenantId requerido' };
        }
        if (blowerId) {
            const threshold = await this.sensorsService.getLatestThreshold(tenantId, blowerId);
            client.send(JSON.stringify({
                event: 'current_threshold',
                data: { threshold, blowerId },
            }));
        }
        else {
            const thresholds = await this.sensorsService.getAllThresholds(tenantId);
            client.send(JSON.stringify({
                event: 'current_threshold',
                data: { thresholds },
            }));
        }
    }
    handleCurrentThreshold(data, sender) {
        const senderInfo = this.ensureClientInfo(sender);
        if (!senderInfo)
            return;
        for (const [client, info] of this.connectionRegistry.clients) {
            if (client.readyState === ws_2.default.OPEN &&
                info.tenantId === senderInfo.tenantId) {
                client.send(JSON.stringify({ event: 'current_threshold', data }));
            }
        }
    }
    async handleDeviceInfo(data, client) {
        const clientInfo = this.ensureClientInfo(client);
        if (!clientInfo?.blowerConfigId)
            return;
        try {
            await this.sensorsService.updateDeviceMetadata(clientInfo.blowerConfigId, {
                firmwareVersion: data.firmware,
                wifiRssi: data.rssi,
                uptimeMs: data.uptime,
                freeHeap: data.heap,
            });
            if (data.uptime !== undefined) {
                this.deviceTimeService.registrarDeviceInfo(clientInfo.blowerConfigId, data.uptime * 1000);
            }
            if (client.readyState === ws_2.default.OPEN) {
                client.send(JSON.stringify({ event: 'device_info_ack', data: { ok: true } }));
            }
        }
        catch (error) {
            this.logger.error(`Device info error: ${error instanceof Error ? error.message : 'Unknown'}`);
        }
    }
    async handleSetDeviceConfig(data, client) {
        const clientInfo = this.ensureClientInfo(client);
        const blowerId = data.blowerId || clientInfo?.blowerId;
        const tenantId = clientInfo?.tenantId;
        if (!blowerId || !tenantId) {
            return { status: 'error', message: 'blowerId requerido' };
        }
        const config = await this.sensorsService.getBlowerConfigByTenantAndId(tenantId, blowerId);
        if (!config) {
            return {
                status: 'error',
                message: 'Configuración del blower no encontrada',
            };
        }
        const update = {};
        if (data.readIntervalMs !== undefined) {
            if (data.readIntervalMs < 500 || data.readIntervalMs > 60000) {
                return {
                    status: 'error',
                    message: 'readIntervalMs debe ser 500-60000',
                };
            }
            update.readIntervalMs = data.readIntervalMs;
        }
        if (data.scaleFactor !== undefined) {
            if (data.scaleFactor <= 0) {
                return { status: 'error', message: 'scaleFactor debe ser > 0' };
            }
            update.scaleFactor = data.scaleFactor;
        }
        if (Object.keys(update).length === 0) {
            return {
                status: 'error',
                message: 'No hay campos válidos para actualizar',
            };
        }
        await this.sensorsService.updateDeviceConfig(config.id, update);
        for (const [c, info] of this.connectionRegistry.clients) {
            if (c.readyState === ws_2.default.OPEN && info.tenantId === tenantId) {
                c.send(JSON.stringify({
                    event: 'device_config_update',
                    data: { blowerId, ...update },
                }));
            }
        }
        return { status: 'success', blowerId, ...update };
    }
};
exports.SensorsGateway = SensorsGateway;
__decorate([
    (0, websockets_1.WebSocketServer)(),
    __metadata("design:type", ws_1.Server)
], SensorsGateway.prototype, "server", void 0);
__decorate([
    (0, websockets_1.SubscribeMessage)('register_blower'),
    __param(0, (0, websockets_1.MessageBody)()),
    __param(1, (0, websockets_1.ConnectedSocket)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, ws_2.default]),
    __metadata("design:returntype", Promise)
], SensorsGateway.prototype, "handleRegisterBlower", null);
__decorate([
    (0, websockets_1.SubscribeMessage)('pressure_reading'),
    __param(0, (0, websockets_1.MessageBody)()),
    __param(1, (0, websockets_1.ConnectedSocket)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, ws_2.default]),
    __metadata("design:returntype", Promise)
], SensorsGateway.prototype, "handlePressureReading", null);
__decorate([
    (0, websockets_1.SubscribeMessage)('batch_readings'),
    __param(0, (0, websockets_1.MessageBody)()),
    __param(1, (0, websockets_1.ConnectedSocket)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, ws_2.default]),
    __metadata("design:returntype", Promise)
], SensorsGateway.prototype, "handleBatchReadings", null);
__decorate([
    (0, websockets_1.SubscribeMessage)('set_new_threshold'),
    __param(0, (0, websockets_1.MessageBody)()),
    __param(1, (0, websockets_1.ConnectedSocket)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, ws_2.default]),
    __metadata("design:returntype", Promise)
], SensorsGateway.prototype, "handleSetNewThreshold", null);
__decorate([
    (0, websockets_1.SubscribeMessage)('get_threshold'),
    __param(0, (0, websockets_1.MessageBody)()),
    __param(1, (0, websockets_1.ConnectedSocket)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, ws_2.default]),
    __metadata("design:returntype", Promise)
], SensorsGateway.prototype, "handleGetThreshold", null);
__decorate([
    (0, websockets_1.SubscribeMessage)('current_threshold'),
    __param(0, (0, websockets_1.MessageBody)()),
    __param(1, (0, websockets_1.ConnectedSocket)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, ws_2.default]),
    __metadata("design:returntype", void 0)
], SensorsGateway.prototype, "handleCurrentThreshold", null);
__decorate([
    (0, websockets_1.SubscribeMessage)('device_info'),
    __param(0, (0, websockets_1.MessageBody)()),
    __param(1, (0, websockets_1.ConnectedSocket)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, ws_2.default]),
    __metadata("design:returntype", Promise)
], SensorsGateway.prototype, "handleDeviceInfo", null);
__decorate([
    (0, websockets_1.SubscribeMessage)('set_device_config'),
    __param(0, (0, websockets_1.MessageBody)()),
    __param(1, (0, websockets_1.ConnectedSocket)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, ws_2.default]),
    __metadata("design:returntype", Promise)
], SensorsGateway.prototype, "handleSetDeviceConfig", null);
exports.SensorsGateway = SensorsGateway = SensorsGateway_1 = __decorate([
    (0, common_1.UseGuards)(ws_auth_guard_1.WsAuthGuard),
    (0, websockets_1.WebSocketGateway)(),
    __metadata("design:paramtypes", [sensors_service_1.SensorsService,
        iot_service_1.IotService,
        jwt_1.JwtService,
        device_time_service_1.DeviceTimeService,
        device_connection_registry_1.DeviceConnectionRegistry])
], SensorsGateway);
//# sourceMappingURL=sensors.gateway.js.map