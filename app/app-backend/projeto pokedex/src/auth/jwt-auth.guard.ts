import { SESSION_VERSION } from './session-version.token';
import type { SessionVersions } from './session-version.token';
import { assertTrustedOrigin, cookieToken } from './session-cookie';
import {
  CanActivate,
  ExecutionContext,
  Injectable,
  Inject,
  UnauthorizedException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { JwtService } from '@nestjs/jwt';
import { IS_PUBLIC } from './public.decorator';
import type {
  AuthenticatedRequest,
  AuthenticatedUser,
} from './authenticated-request';
@Injectable()
export class JwtAuthGuard implements CanActivate {
  constructor(
    private readonly jwt: JwtService,
    private readonly reflector: Reflector,
    @Inject(SESSION_VERSION) private readonly sessions: SessionVersions,
  ) {}
  async canActivate(context: ExecutionContext): Promise<boolean> {
    if (
      this.reflector.getAllAndOverride<boolean>(IS_PUBLIC, [
        context.getHandler(),
        context.getClass(),
      ])
    )
      return true;
    const request = context.switchToHttp().getRequest<AuthenticatedRequest>();
    const authorization = request.headers.authorization;
    const token = authorization?.startsWith('Bearer ')
      ? authorization.slice(7).trim()
      : cookieToken(request);
    if (!token) throw new UnauthorizedException('Sessão ausente.');
    if (
      !authorization?.startsWith('Bearer ') &&
      !['GET', 'HEAD', 'OPTIONS'].includes(request.method ?? 'GET')
    )
      assertTrustedOrigin(request);
    try {
      const payload = this.jwt.verify<AuthenticatedUser>(token);
      if (!Number.isSafeInteger(payload.sub) || payload.sub < 1)
        throw new Error('Invalid subject');
      const version = await this.sessions.getVersion(payload.sub);
      if (version === null || version !== (payload.sessionVersion ?? 0))
        throw new Error('Session revoked');
      request.user = { ...payload, id: payload.sub };
      return true;
    } catch {
      throw new UnauthorizedException('Token inválido ou expirado');
    }
  }
}
