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
exports.IotController = void 0;
const common_1 = require("@nestjs/common");
const swagger_1 = require("@nestjs/swagger");
const iot_service_1 = require("./iot.service");
const provision_dto_1 = require("./dto/provision.dto");
let IotController = class IotController {
    iotService;
    constructor(iotService) {
        this.iotService = iotService;
    }
    async provision(dto, req) {
        return this.iotService.provision(req.user.tenantId, dto);
    }
    async listDevices(req) {
        return this.iotService.listDeviceKeys(req.user.tenantId);
    }
    async revokeDevice(key) {
        return this.iotService.revokeDeviceKey(key);
    }
};
exports.IotController = IotController;
__decorate([
    (0, common_1.Post)('provision'),
    (0, swagger_1.ApiOperation)({
        summary: 'Provision a new IoT device and generate a device key',
    }),
    __param(0, (0, common_1.Body)()),
    __param(1, (0, common_1.Req)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [provision_dto_1.ProvisionDto, Object]),
    __metadata("design:returntype", Promise)
], IotController.prototype, "provision", null);
__decorate([
    (0, common_1.Get)('devices'),
    (0, swagger_1.ApiOperation)({ summary: 'List all device keys for a tenant' }),
    __param(0, (0, common_1.Req)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", Promise)
], IotController.prototype, "listDevices", null);
__decorate([
    (0, common_1.Patch)('devices/:key/revoke'),
    (0, swagger_1.ApiOperation)({ summary: 'Revoke a device key' }),
    __param(0, (0, common_1.Param)('key')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", Promise)
], IotController.prototype, "revokeDevice", null);
exports.IotController = IotController = __decorate([
    (0, swagger_1.ApiTags)('iot'),
    (0, swagger_1.ApiBearerAuth)(),
    (0, common_1.Controller)('iot'),
    __metadata("design:paramtypes", [iot_service_1.IotService])
], IotController);
//# sourceMappingURL=iot.controller.js.map