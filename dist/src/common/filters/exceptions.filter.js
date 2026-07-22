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
var ExceptionsFilter_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.ExceptionsFilter = void 0;
const common_1 = require("@nestjs/common");
const core_1 = require("@nestjs/core");
let ExceptionsFilter = ExceptionsFilter_1 = class ExceptionsFilter {
    httpAdapterHost;
    logger = new common_1.Logger(ExceptionsFilter_1.name);
    constructor(httpAdapterHost) {
        this.httpAdapterHost = httpAdapterHost;
    }
    catch(exception, host) {
        const { httpAdapter } = this.httpAdapterHost;
        const ctx = host.switchToHttp();
        const isProduction = process.env.NODE_ENV === 'production';
        const httpStatus = exception instanceof common_1.HttpException
            ? exception.getStatus()
            : common_1.HttpStatus.INTERNAL_SERVER_ERROR;
        const exceptionResponse = exception instanceof common_1.HttpException
            ? exception.getResponse()
            : { message: 'Internal server error' };
        const message = typeof exceptionResponse === 'object' && exceptionResponse !== null
            ? exceptionResponse.message ||
                exceptionResponse.error ||
                exceptionResponse
            : exceptionResponse;
        if (httpStatus >= 500) {
            this.logger.error(`Error: ${exception instanceof Error ? exception.message : 'Unknown'}\nStack: ${exception instanceof Error ? exception.stack : ''}`);
        }
        else {
            this.logger.warn(`[${httpStatus}] ${Array.isArray(message) ? message.join(', ') : message?.message || message}`);
        }
        const responseBody = {
            statusCode: httpStatus,
            timestamp: new Date().toISOString(),
            path: httpAdapter.getRequestUrl(ctx.getRequest()),
            message: isProduction && httpStatus >= 500 ? 'Internal server error' : message,
            ...(isProduction
                ? {}
                : {
                    errorName: exception instanceof Error ? exception.name : 'UnknownError',
                    stack: exception instanceof Error ? exception.stack : undefined,
                }),
        };
        httpAdapter.reply(ctx.getResponse(), responseBody, httpStatus);
    }
};
exports.ExceptionsFilter = ExceptionsFilter;
exports.ExceptionsFilter = ExceptionsFilter = ExceptionsFilter_1 = __decorate([
    (0, common_1.Catch)(),
    __metadata("design:paramtypes", [core_1.HttpAdapterHost])
], ExceptionsFilter);
//# sourceMappingURL=exceptions.filter.js.map