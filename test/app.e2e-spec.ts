import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { App } from 'supertest/types';
import { AppModule } from './../src/app.module';

// NOTE: these end-to-end tests boot the full application, which connects to
// PostgreSQL (see PrismaService). A reachable database is required.
describe('App (e2e)', () => {
  let app: INestApplication<App>;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    app.setGlobalPrefix('api/v1');
    await app.init();
  });

  afterAll(async () => {
    await app.close();
  });

  it('rejects unauthenticated access to a protected route (401)', () => {
    return request(app.getHttpServer()).get('/api/v1/users').expect(401);
  });

  it('returns 404 for an unknown route', () => {
    return request(app.getHttpServer())
      .get('/api/v1/does-not-exist')
      .expect(404);
  });
});
