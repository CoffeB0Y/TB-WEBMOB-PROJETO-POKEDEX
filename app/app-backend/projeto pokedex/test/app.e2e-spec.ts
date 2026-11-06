import { SESSION_VERSION } from '../src/auth/session-version.token';
import { Test } from '@nestjs/testing';
import { Controller, Get, INestApplication } from '@nestjs/common';
import { APP_GUARD } from '@nestjs/core';
import { JwtModule, JwtService } from '@nestjs/jwt';
import request from 'supertest';
import type { Server } from 'node:http';
import { JwtAuthGuard } from '../src/auth/jwt-auth.guard';
import { Public } from '../src/auth/public.decorator';

@Controller('verification')
class VerificationController {
  @Public() @Get('public') publicRoute() {
    return { public: true };
  }
  @Get('private') privateRoute() {
    return { authenticated: true };
  }
}

describe('Autorização HTTP (sem acesso ao banco)', () => {
  let app: INestApplication<Server>;
  let jwt: JwtService;
  beforeAll(async () => {
    const module = await Test.createTestingModule({
      imports: [JwtModule.register({ secret: 'e2e-only-secret' })],
      controllers: [VerificationController],
      providers: [
        {
          provide: SESSION_VERSION,
          useValue: { getVersion: () => Promise.resolve(0) },
        },
        { provide: APP_GUARD, useClass: JwtAuthGuard },
      ],
    }).compile();
    app = module.createNestApplication();
    jwt = module.get(JwtService);
    await app.init();
  });
  afterAll(async () => {
    await app.close();
  });
  it('permite rota explicitamente pública', () =>
    request(app.getHttpServer())
      .get('/verification/public')
      .expect(200, { public: true }));
  it('bloqueia rota privada sem token, incluindo query de login', () =>
    request(app.getHttpServer())
      .get('/verification/private?next=/auth/login')
      .expect(401));
  it('aceita JWT válido', () =>
    request(app.getHttpServer())
      .get('/verification/private')
      .set('Authorization', `Bearer ${jwt.sign({ sub: 1 })}`)
      .expect(200, { authenticated: true }));
  it('recusa JWT expirado', () =>
    request(app.getHttpServer())
      .get('/verification/private')
      .set('Authorization', `Bearer ${jwt.sign({ sub: 1 }, { expiresIn: -1 })}`)
      .expect(401));
});
