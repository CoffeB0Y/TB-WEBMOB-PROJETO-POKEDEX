import type { Request } from 'express';
export interface AuthenticatedUser {
  exp?: number;
  sessionVersion?: number;
  id: number;
  sub: number;
  email: string;
  name: string;
}
export interface AuthenticatedRequest extends Request {
  user: AuthenticatedUser;
}
