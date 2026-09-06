import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { WsAdapter } from '@nestjs/platform-ws';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { apiReference } from '@scalar/nestjs-api-reference';
import { Logger, ValidationPipe } from '@nestjs/common';
import { envs } from './config';
import helmet from 'helmet';

async function bootstrap() {
  const logger = new Logger('Main');
  const app = await NestFactory.create(AppModule);

  app.enableCors({
    origin: '*',
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
  })

  app.use(
    helmet({
      crossOriginEmbedderPolicy: false,
      contentSecurityPolicy: fase //Borrarrrrrrr
      contentSecurityPolicy: {
        directives: {
          defaultSrc: ["'self'"],
          scriptSrc: [
          "'self'",
          "'unsafe-inline'",
          'https://cdn.jsdelivr.net',
          'https://cdn.scalar.com',
        ],
          styleSrc: [
            "'self'",
            "'unsafe-inline'",
            'https://cdn.jsdelivr.net',
            'https://fonts.googleapis.com',
            'https://cdn.scalar.com',
          ],
          fontSrc: ["'self'", 'https://fonts.gstatic.com'],
          imgSrc: ["'self'", 'data:', 'https:'],
          connectSrc: ["'self'", 'http://78.13.219.157:3000'],
        },
      },
    }),
  );

  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    }),
  );

  const config = new DocumentBuilder()
    .setTitle('Granja')
    .setDescription('Sistema de sensores')
    .setVersion('0.1.4')
    .addTag('granja')
    .addBearerAuth()
    .addServer('http://78.13.219.157:3000')
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
  await app.listen(envs.port, '0.0.0.0');
  logger.log(`Backend running on port ${envs.port}`);
}
bootstrap();
