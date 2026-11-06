import { BadRequestException, Injectable, Logger } from '@nestjs/common';
import { createHash, randomBytes } from 'node:crypto';
import * as bcrypt from 'bcryptjs';
import { assertPasswordBytes } from './password-policy';
import { PrismaService } from '../database/prisma.service';
import { ResetMailService } from './reset-mail.service';
import { ResetRateLimitService } from './reset-rate-limit.service';

const accepted = {
  message:
    'Se o e-mail estiver cadastrado, você receberá as instruções de recuperação.',
};

@Injectable()
export class PasswordResetService {
  private readonly logger = new Logger(PasswordResetService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly mail: ResetMailService,
    private readonly limits: ResetRateLimitService,
  ) {}

  async request(email: string, ip: string) {
    this.limits.consume('request-ip', ip, 5, 15 * 60000);
    const normalized = email.trim().toLowerCase();
    this.limits.consume('request-email', normalized, 1, 60000);
    this.mail.configuration();
    const user = await this.prisma.user.findUnique({
      where: { email: normalized },
      select: { id: true, email: true },
    });
    if (!user) return accepted;
    const token = randomBytes(32).toString('hex');
    const tokenHash = createHash('sha256').update(token).digest('hex');
    await this.prisma.$transaction(async (tx) => {
      await tx.passwordResetToken.deleteMany({ where: { userId: user.id } });
      await tx.passwordResetToken.create({
        data: {
          tokenHash,
          userId: user.id,
          expiresAt: new Date(Date.now() + 15 * 60000),
        },
      });
    });
    // O resultado HTTP não revela existência da conta nem espera a conexão SMTP.
    void this.deliver(user.email, token, tokenHash);
    return accepted;
  }

  private async deliver(
    email: string,
    token: string,
    tokenHash: string,
  ): Promise<void> {
    try {
      await this.mail.send(email, token);
    } catch {
      this.logger.warn(
        'Falha no envio da recuperação de senha. Verifique a configuração SMTP.',
      );
      try {
        await this.prisma.passwordResetToken.deleteMany({
          where: { tokenHash },
        });
      } catch {
        this.logger.warn(
          'Não foi possível invalidar a solicitação após falha de envio.',
        );
      }
    }
  }

  async reset(token: string, password: string, ip: string) {
    this.limits.consume('reset-ip', ip, 10, 15 * 60000);
    assertPasswordBytes(password);
    const tokenHash = createHash('sha256').update(token).digest('hex');
    const passwordHash = await bcrypt.hash(password, 12);
    await this.prisma.$transaction(async (tx) => {
      const now = new Date();
      const reset = await tx.passwordResetToken.findUnique({
        where: { tokenHash },
      });
      if (!reset || reset.usedAt || reset.expiresAt <= now)
        throw new BadRequestException(
          'Link inválido ou expirado. Solicite uma nova recuperação.',
        );
      const claimed = await tx.passwordResetToken.updateMany({
        where: { tokenHash, usedAt: null, expiresAt: { gt: now } },
        data: { usedAt: now },
      });
      if (claimed.count !== 1)
        throw new BadRequestException(
          'Link inválido ou expirado. Solicite uma nova recuperação.',
        );
      await tx.user.update({
        where: { id: reset.userId },
        data: { passwordHash, sessionVersion: { increment: 1 } },
      });
      await tx.passwordResetToken.updateMany({
        where: { userId: reset.userId, usedAt: null },
        data: { usedAt: now },
      });
    });
    return {
      message: 'Senha redefinida com sucesso. Entre com sua nova senha.',
    };
  }
}
