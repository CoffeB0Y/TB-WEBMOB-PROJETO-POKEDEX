import { jest } from '@jest/globals';
import {
  ExecutionContext,
  ForbiddenException,
  UnauthorizedException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { JwtService } from '@nestjs/jwt';
import { JwtAuthGuard } from './jwt-auth.guard';
import type { SessionVersions } from './session-version.token';
import type { AuthenticatedRequest } from './authenticated-request';

describe('JwtAuthGuard', () => {
  const jwt = new JwtService({ secret: 'test-only-secret' });
  const reflector = new Reflector();
  const sessions: SessionVersions = {
    getVersion: (): Promise<number | null> => Promise.resolve(0),
  };
  const guard = new JwtAuthGuard(jwt, reflector, sessions);
  function context(request: Partial<AuthenticatedRequest>): ExecutionContext {
    return {
      getHandler: () => context,
      getClass: () => JwtAuthGuard,
      switchToHttp: () => ({ getRequest: () => request }),
    } as unknown as ExecutionContext;
  }
  afterEach(() => jest.restoreAllMocks());
  it('exige token mesmo quando a query contem o caminho de login', async () => {
    await expect(
      guard.canActivate(
        context({ originalUrl: '/api/users?next=/auth/login', headers: {} }),
      ),
    ).rejects.toThrow(UnauthorizedException);
  });
  it('normaliza o subject do JWT para o identificador do treinador', async () => {
    const request = {
      headers: {
        authorization: `Bearer ${jwt.sign({ sub: 42, email: 'trainer@example.com' })}`,
      },
    } as AuthenticatedRequest;
    await expect(guard.canActivate(context(request))).resolves.toBe(true);
    expect(request.user.id).toBe(42);
  });
  it('recusa assinatura invalida', async () => {
    const other = new JwtService({ secret: 'other-secret' });
    await expect(
      guard.canActivate(
        context({
          headers: { authorization: `Bearer ${other.sign({ sub: 42 })}` },
        }),
      ),
    ).rejects.toThrow(UnauthorizedException);
  });
  it('recusa token expirado', async () => {
    await expect(
      guard.canActivate(
        context({
          headers: {
            authorization: `Bearer ${jwt.sign({ sub: 42 }, { expiresIn: -1 })}`,
          },
        }),
      ),
    ).rejects.toThrow(UnauthorizedException);
  });
  it.each([undefined, '42', 0, -1])(
    'recusa subject invalido %s',
    async (sub) => {
      await expect(
        guard.canActivate(
          context({
            headers: { authorization: `Bearer ${jwt.sign({ sub })}` },
          }),
        ),
      ).rejects.toThrow(UnauthorizedException);
    },
  );
  it('libera somente handlers explicitamente publicos', async () => {
    jest.spyOn(reflector, 'getAllAndOverride').mockReturnValue(true);
    await expect(guard.canActivate(context({ headers: {} }))).resolves.toBe(
      true,
    );
  });
  it('autentica cookie de sessão', async () => {
    const request = {
      headers: { cookie: `pokedex_session=${jwt.sign({ sub: 42 })}` },
    } as AuthenticatedRequest;
    await expect(guard.canActivate(context(request))).resolves.toBe(true);
    expect(request.user.id).toBe(42);
  });
  it('recusa cookie malformado', async () => {
    await expect(
      guard.canActivate(
        context({ headers: { cookie: 'pokedex_session=%zz' } }),
      ),
    ).rejects.toThrow(UnauthorizedException);
  });
  it('bloqueia mutação por origem externa, inclusive com outro esquema de autorização', async () => {
    await expect(
      guard.canActivate(
        context({
          method: 'PATCH',
          headers: {
            cookie: `pokedex_session=${jwt.sign({ sub: 42 })}`,
            origin: 'https://attacker.invalid',
            authorization: 'Basic invalid',
          },
        }),
      ),
    ).rejects.toThrow(ForbiddenException);
  });
  it('permite mutação por cookie da origem configurada', async () => {
    await expect(
      guard.canActivate(
        context({
          method: 'PATCH',
          headers: {
            cookie: `pokedex_session=${jwt.sign({ sub: 42 })}`,
            origin: 'http://localhost:3001',
          },
        }),
      ),
    ).resolves.toBe(true);
  });
  it('recusa sessão revogada por redefinição da senha', async () => {
    jest.spyOn(sessions, 'getVersion').mockResolvedValue(1);
    await expect(
      guard.canActivate(
        context({
          headers: {
            authorization: `Bearer ${jwt.sign({ sub: 42, sessionVersion: 0 })}`,
          },
        }),
      ),
    ).rejects.toThrow(UnauthorizedException);
  });
  it('recusa conta excluída', async () => {
    jest.spyOn(sessions, 'getVersion').mockResolvedValue(null);
    await expect(
      guard.canActivate(
        context({
          headers: { authorization: `Bearer ${jwt.sign({ sub: 42 })}` },
        }),
      ),
    ).rejects.toThrow(UnauthorizedException);
  });
});
