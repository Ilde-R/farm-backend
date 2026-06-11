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
Object.defineProperty(exports, "__esModule", { value: true });
exports.SensorsGateway = void 0;
const websockets_1 = require("@nestjs/websockets");
const sensors_service_1 = require("./sensors.service");
const ws_1 = require("ws");
let SensorsGateway = class SensorsGateway {
    sensorsService;
    server;
    constructor(sensorsService) {
        this.sensorsService = sensorsService;
    }
    async create(data) {
        try {
            console.log('¡NUEVO MENSAJE RECIBIDO DEL ARDUINO!:', data);
            const record = await this.sensorsService.create(data);
            if (this.server && this.server.clients) {
                for (const client of this.server.clients) {
                    if (client.readyState === 1) {
                        client.send(JSON.stringify({
                            event: 'pressure_reading',
                            data: data,
                        }));
                    }
                }
            }
            return record;
        }
        catch (error) {
            console.error('ERROR AL GUARDAR LECTURA DE PRESIÓN:', error);
        }
    }
    handleSetNewThreshold(data) {
        const message = JSON.stringify({
            event: 'update_threshold',
            data: {
                threshold: data.threshold,
            },
        });
        this.server.clients.forEach((client) => {
            if (client.readyState === 1) {
                client.send(message);
            }
        });
        return { status: 'success', threshold: data.threshold };
    }
    async handleGetThreshold(data) {
        const threshold = await this.sensorsService.getLatestThreshold(data?.blowerId);
        this.server.clients.forEach((client) => {
            if (client.readyState === 1) {
                client.send(JSON.stringify({
                    event: 'current_threshold',
                    data: { threshold }
                }));
            }
        });
    }
    handleCurrentThreshold(data) {
        this.server.clients.forEach((client) => {
            if (client.readyState === 1) {
                client.send(JSON.stringify({ event: 'current_threshold', data }));
            }
        });
    }
};
exports.SensorsGateway = SensorsGateway;
__decorate([
    (0, websockets_1.WebSocketServer)(),
    __metadata("design:type", ws_1.Server)
], SensorsGateway.prototype, "server", void 0);
__decorate([
    (0, websockets_1.SubscribeMessage)('pressure_reading'),
    __param(0, (0, websockets_1.MessageBody)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", Promise)
], SensorsGateway.prototype, "create", null);
__decorate([
    (0, websockets_1.SubscribeMessage)('set_new_threshold'),
    __param(0, (0, websockets_1.MessageBody)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", void 0)
], SensorsGateway.prototype, "handleSetNewThreshold", null);
__decorate([
    (0, websockets_1.SubscribeMessage)('get_threshold'),
    __param(0, (0, websockets_1.MessageBody)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", Promise)
], SensorsGateway.prototype, "handleGetThreshold", null);
__decorate([
    (0, websockets_1.SubscribeMessage)('current_threshold'),
    __param(0, (0, websockets_1.MessageBody)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", void 0)
], SensorsGateway.prototype, "handleCurrentThreshold", null);
exports.SensorsGateway = SensorsGateway = __decorate([
    (0, websockets_1.WebSocketGateway)({ cors: true }),
    __metadata("design:paramtypes", [sensors_service_1.SensorsService])
], SensorsGateway);
//# sourceMappingURL=sensors.gateway.js.map