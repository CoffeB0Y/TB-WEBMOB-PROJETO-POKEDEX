import { ForbiddenException } from '@nestjs/common';
import type { Request, Response } from 'express';
export const SESSION_COOKIE = 'pokedex_session';
export function cookieToken(request: Request): string | undefined {
  const value = request.headers.cookie
    ?.split(';')
    .map((item) => item.trim())
    .find((item) => item.startsWith(`${SESSION_COOKIE}=`));
  if (!value) return undefined;
  try {
    return decodeURIComponent(value.slice(SESSION_COOKIE.length + 1));
  } catch {
    return undefined;
  }
}
export function assertTrustedOrigin(request: Request): void {
  const origin = request.headers.origin;
  const allowed = (process.env.FRONTEND_ORIGIN ?? 'http://localhost:3001')
    .split(',')
    .map((value) => value.trim());
  if (origin && !allowed.includes(origin))
    throw new ForbiddenException('Origem não autorizada.');
}
const options = () => ({
  httpOnly: true,
  secure: process.env.NODE_ENV === 'production',
  sameSite: 'lax' as const,
  path: '/api',
});
export function setSessionCookie(
  response: Response,
  token: string,
  remember = false,
): void {
  response.cookie(SESSION_COOKIE, token, {
    ...options(),
    ...(remember ? { maxAge: 86400000 } : {}),
  });
}
export function clearSessionCookie(response: Response): void {
  response.clearCookie(SESSION_COOKIE, options());
}
