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
let SensorsGateway = SensorsGateway_1 = class SensorsGateway {
    sensorsService;
    iotService;
    jwtService;
    logger = new common_1.Logger(SensorsGateway_1.name);
    server;
    connectedClients = new Map();
    heartbeatTimers = new Map();
    ensureClientInfo(client) {
        let info = this.connectedClients.get(client);
        if (!info) {
            info = getClientInfo(client);
            if (info) {
                this.connectedClients.set(client, info);
            }
        }
        return info;
    }
    constructor(sensorsService, iotService, jwtService) {
        this.sensorsService = sensorsService;
        this.iotService = iotService;
        this.jwtService = jwtService;
    }
    broadcastToUsers(tenantId, message, exclude) {
        for (const [c, info] of this.connectedClients) {
            const userData = c.user;
            if (c !== exclude &&
                c.readyState === ws_2.default.OPEN &&
                userData &&
                userData.tenantId === tenantId) {
                c.send(JSON.stringify(message));
            }
        }
    }
    getOnlineDevices(tenantId) {
        const seen = new Set();
        const devices = [];
        for (const [, info] of this.connectedClients) {
            if (info.blowerId && info.tenantId === tenantId && !seen.has(info.blowerId)) {
                seen.add(info.blowerId);
                devices.push({ blowerId: info.blowerId, blowerConfigId: info.blowerConfigId });
            }
        }
        return devices;
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
            this.connectedClients.set(client, info);
        }
        client.on('pong', () => {
            this.clearHeartbeat(client);
            this.startHeartbeat(client);
        });
        this.startHeartbeat(client);
        const device = client.device;
        const user = client.user;
        if (device) {
            this.broadcastToUsers(info.tenantId, {
                event: 'device_online',
                data: { blowerId: info.blowerId, blowerConfigId: info.blowerConfigId },
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
                client.send(JSON.stringify({ event: 'devices_online', data: { devices: onlineDevices } }));
            }
        }
    }
    handleDisconnect(client) {
        this.clearHeartbeat(client);
        const info = this.connectedClients.get(client);
        if (info?.blowerId) {
            this.broadcastToUsers(info.tenantId, {
                event: 'device_offline',
                data: { blowerId: info.blowerId },
            }, client);
        }
        this.connectedClients.delete(client);
    }
    async isDeviceActive(client) {
        const device = client.device;
        if (!device?.deviceKey)
            return true;
        const valid = await this.iotService.validateDeviceKey(device.deviceKey);
        if (!valid) {
            this.logger.warn(`Device key revoked mid-session, closing connection`);
            client.send(JSON.stringify({ event: 'auth_error', data: { reason: 'key_revoked' } }));
            client.close(4001, 'Device key revoked');
            return false;
        }
        return true;
    }
    async handleRegisterBlower(data, client) {
        try {
            if (!(await this.isDeviceActive(client)))
                return;
            const clientInfo = this.ensureClientInfo(client);
            const tenantId = data.tenantId || clientInfo?.tenantId;
            const blowerId = data.blowerId || clientInfo?.blowerId;
            if (!tenantId || !blowerId) {
                return { status: 'error', message: 'tenantId and blowerId required' };
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
            if (!(await this.isDeviceActive(client)))
                return;
            const clientInfo = this.ensureClientInfo(client);
            const enriched = {
                psi: data.psi ?? 0,
                blowerConfigId: data.blowerConfigId || clientInfo?.blowerConfigId,
                tenantId: data.tenantId || clientInfo?.tenantId,
                blowerId: data.blowerId || clientInfo?.blowerId,
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
            await this.sensorsService.create(enriched);
            for (const [c, info] of this.connectedClients) {
                if (c.readyState === ws_2.default.OPEN && info.tenantId === enriched.tenantId) {
                    c.send(JSON.stringify({
                        event: 'pressure_reading',
                        data: enriched,
                    }));
                }
            }
            if (client.readyState === ws_2.default.OPEN) {
                client.send(JSON.stringify({ event: 'reading_ack', data: { ok: true, ts: Date.now() } }));
            }
            return { ok: true };
        }
        catch (error) {
            this.logger.error(`Pressure reading error: ${error instanceof Error ? error.message : 'Unknown'}`);
        }
    }
    async handleSetNewThreshold(data, client) {
        if (!(await this.isDeviceActive(client)))
            return;
        const clientInfo = this.ensureClientInfo(client);
        const blowerId = data.blowerId || clientInfo?.blowerId;
        const tenantId = clientInfo?.tenantId;
        if (!blowerId || !tenantId) {
            return { status: 'error', message: 'blowerId required' };
        }
        await this.sensorsService.updateThreshold(tenantId, blowerId, data.threshold);
        for (const [c, info] of this.connectedClients) {
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
        if (!(await this.isDeviceActive(client)))
            return;
        const clientInfo = this.ensureClientInfo(client);
        const tenantId = clientInfo?.tenantId;
        const blowerId = data?.blowerId || clientInfo?.blowerId;
        if (!tenantId) {
            return { status: 'error', message: 'tenantId required' };
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
        for (const [client, info] of this.connectedClients) {
            if (client.readyState === ws_2.default.OPEN && info.tenantId === senderInfo.tenantId) {
                client.send(JSON.stringify({ event: 'current_threshold', data }));
            }
        }
    }
    async handleDeviceInfo(data, client) {
        if (!(await this.isDeviceActive(client)))
            return;
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
            if (client.readyState === ws_2.default.OPEN) {
                client.send(JSON.stringify({ event: 'device_info_ack', data: { ok: true } }));
            }
        }
        catch (error) {
            this.logger.error(`Device info error: ${error instanceof Error ? error.message : 'Unknown'}`);
        }
    }
    async handleSetDeviceConfig(data, client) {
        if (!(await this.isDeviceActive(client)))
            return;
        const clientInfo = this.ensureClientInfo(client);
        const blowerId = data.blowerId || clientInfo?.blowerId;
        const tenantId = clientInfo?.tenantId;
        if (!blowerId || !tenantId) {
            return { status: 'error', message: 'blowerId required' };
        }
        const config = await this.sensorsService.getBlowerConfigByTenantAndId(tenantId, blowerId);
        if (!config) {
            return { status: 'error', message: 'BlowerConfig not found' };
        }
        const update = {};
        if (data.readIntervalMs !== undefined) {
            if (data.readIntervalMs < 500 || data.readIntervalMs > 60000) {
                return { status: 'error', message: 'readIntervalMs must be 500-60000' };
            }
            update.readIntervalMs = data.readIntervalMs;
        }
        if (data.scaleFactor !== undefined) {
            if (data.scaleFactor <= 0) {
                return { status: 'error', message: 'scaleFactor must be > 0' };
            }
            update.scaleFactor = data.scaleFactor;
        }
        if (Object.keys(update).length === 0) {
            return { status: 'error', message: 'No valid fields to update' };
        }
        await this.sensorsService.updateDeviceConfig(config.id, update);
        for (const [c, info] of this.connectedClients) {
            if (c.readyState === ws_2.default.OPEN &&
                info.tenantId === tenantId) {
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
        jwt_1.JwtService])
], SensorsGateway);
//# sourceMappingURL=sensors.gateway.js.map