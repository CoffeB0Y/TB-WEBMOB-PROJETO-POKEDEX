import { PasswordResetService } from './password-reset.service';
import { ForgotPasswordDto, ResetPasswordDto } from './reset-password.dto';
import {
  Body,
  Controller,
  Get,
  HttpCode,
  Post,
  Req,
  Res,
} from '@nestjs/common';
import type { Request, Response } from 'express';
import type { AuthenticatedRequest } from './authenticated-request';
import { AuthService } from './auth.service';
import { LoginDto } from '../dtos/login-dto';
import { RegisterDto } from '../dtos/register-dto';
import { Public } from './public.decorator';
import {
  assertTrustedOrigin,
  clearSessionCookie,
  setSessionCookie,
} from './session-cookie';

@Controller('auth')
export class AuthController {
  constructor(
    private readonly auth: AuthService,
    private readonly recovery: PasswordResetService,
  ) {}
  @Post('login')
  @Public()
  async login(
    @Body() dto: LoginDto,
    @Req() req: Request,
    @Res({ passthrough: true }) response: Response,
  ) {
    assertTrustedOrigin(req);
    const result = await this.auth.login(dto.email, dto.password);
    setSessionCookie(response, result.access_token, dto.rememberMe);
    return result;
  }
  @Post('register')
  @Public()
  async register(
    @Body() dto: RegisterDto,
    @Req() req: Request,
    @Res({ passthrough: true }) response: Response,
  ) {
    assertTrustedOrigin(req);
    const result = await this.auth.register({
      name: dto.name,
      email: dto.email,
      passwordHash: dto.password ?? dto.passwordHash ?? '',
    });
    setSessionCookie(response, result.access_token);
    return result;
  }
  @Post('forgot-password')
  @Public()
  @HttpCode(202)
  forgotPassword(@Body() dto: ForgotPasswordDto, @Req() request: Request) {
    assertTrustedOrigin(request);
    return this.recovery.request(
      dto.email,
      request.ip ?? request.socket.remoteAddress ?? 'unknown',
    );
  }
  @Post('reset-password')
  @Public()
  @HttpCode(200)
  async resetPassword(
    @Body() dto: ResetPasswordDto,
    @Req() request: Request,
    @Res({ passthrough: true }) response: Response,
  ) {
    assertTrustedOrigin(request);
    const result = await this.recovery.reset(
      dto.token,
      dto.password,
      request.ip ?? request.socket.remoteAddress ?? 'unknown',
    );
    clearSessionCookie(response);
    return result;
  }
  @Get('session')
  session(@Req() request: AuthenticatedRequest) {
    return {
      user: {
        id: request.user.id,
        name: request.user.name,
        email: request.user.email,
      },
      expiresAt: (request.user.exp ?? 0) * 1000,
    };
  }
  @Post('logout')
  @Public()
  logout(
    @Req() request: Request,
    @Res({ passthrough: true }) response: Response,
  ) {
    assertTrustedOrigin(request);
    clearSessionCookie(response);
    return { message: 'Sessão encerrada.' };
  }
}
