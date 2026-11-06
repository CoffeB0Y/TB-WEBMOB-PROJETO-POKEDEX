import { SESSION_VERSION } from './session-version.token';
import { PasswordResetService } from './password-reset.service';
import { ResetMailService } from './reset-mail.service';
import { ResetRateLimitService } from './reset-rate-limit.service';
import { SessionVersionService } from './session-version.service';
import { Global, Module } from '@nestjs/common';
import { APP_GUARD } from '@nestjs/core';
import { JwtModule } from '@nestjs/jwt';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { AuthService } from './auth.service';
import { AuthController } from './auth.controller';
import { UsersModule } from '../users/users.module';
import { JwtAuthGuard } from './jwt-auth.guard';
@Global()
@Module({
  imports: [
    ConfigModule,
    UsersModule,
    //usado para ler o .env
    JwtModule.registerAsync({
      inject: [ConfigService],
      useFactory: (cfg: ConfigService) => ({
        secret: cfg.getOrThrow<string>('JWT_SECRET'),
        signOptions: { expiresIn: '1d' },
      }),
    }),
  ],
  providers: [
    AuthService,
    JwtAuthGuard,
    PasswordResetService,
    ResetMailService,
    ResetRateLimitService,
    SessionVersionService,
    { provide: SESSION_VERSION, useExisting: SessionVersionService },
    { provide: APP_GUARD, useClass: JwtAuthGuard },
    //APP_GUARD= token DI Nest que permite registrar um Guard global
  ],
  controllers: [AuthController],
  exports: [JwtModule, JwtAuthGuard, SESSION_VERSION],
})
export class AuthModule {}
