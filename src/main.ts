import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { WsAdapter } from '@nestjs/platform-ws';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { apiReference } from '@scalar/nestjs-api-reference';
import { Logger } from '@nestjs/common';
import { envs } from './config';

async function bootstrap() {
  const logger = new Logger('Main');
  const app = await NestFactory.create(AppModule);

  const config = new DocumentBuilder()
    .setTitle('Granja')
    .setDescription('Sistema de sensores')
    .setVersion('0.1.0')
    .addTag('granja')
    .build();

  const documentFactory = () => SwaggerModule.createDocument(app, config);
  SwaggerModule.setup('api-swagger', app, documentFactory);

  const document = documentFactory();

  app.use(
    '/docs',
    apiReference({
      spec: { content: document },
    }),
  );

  app.useWebSocketAdapter(new WsAdapter(app));
  app.enableCors();
  await app.listen(envs.port);
  logger.log(`Backend running on port ${envs.port}`);
}
bootstrap();
