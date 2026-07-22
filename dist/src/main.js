"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const core_1 = require("@nestjs/core");
const app_module_1 = require("./app.module");
const platform_ws_1 = require("@nestjs/platform-ws");
const swagger_1 = require("@nestjs/swagger");
const nestjs_api_reference_1 = require("@scalar/nestjs-api-reference");
const common_1 = require("@nestjs/common");
const config_1 = require("./config");
async function bootstrap() {
    const logger = new common_1.Logger('Main');
    const app = await core_1.NestFactory.create(app_module_1.AppModule);
    const config = new swagger_1.DocumentBuilder()
        .setTitle('Granja')
        .setDescription('Sistema de sensores')
        .setVersion('0.1.0')
        .addTag('granja')
        .build();
    const documentFactory = () => swagger_1.SwaggerModule.createDocument(app, config);
    swagger_1.SwaggerModule.setup('api-swagger', app, documentFactory);
    const document = documentFactory();
    app.use('/docs', (0, nestjs_api_reference_1.apiReference)({
        spec: { content: document },
    }));
    app.useWebSocketAdapter(new platform_ws_1.WsAdapter(app));
    app.enableCors();
    await app.listen(config_1.envs.port);
    logger.log(`Backend running on port ${config_1.envs.port}`);
}
bootstrap();
//# sourceMappingURL=main.js.map