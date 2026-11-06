import { Injectable, ServiceUnavailableException } from '@nestjs/common';
import { createTransport } from 'nodemailer';

@Injectable()
export class ResetMailService {
  configuration() {
    const {
      SMTP_HOST,
      SMTP_PORT,
      SMTP_USER,
      SMTP_PASS,
      SMTP_FROM,
      PASSWORD_RESET_URL,
    } = process.env;
    const port = Number(SMTP_PORT);
    if (
      !SMTP_HOST ||
      !Number.isInteger(port) ||
      port < 1 ||
      port > 65535 ||
      !SMTP_USER ||
      !SMTP_PASS ||
      !SMTP_FROM ||
      !PASSWORD_RESET_URL
    ) {
      throw new ServiceUnavailableException(
        'Recuperação de senha temporariamente indisponível.',
      );
    }
    let url: URL;
    try {
      url = new URL(PASSWORD_RESET_URL);
    } catch {
      throw new ServiceUnavailableException(
        'Recuperação de senha temporariamente indisponível.',
      );
    }
    if (
      !['http:', 'https:'].includes(url.protocol) ||
      url.username ||
      url.password ||
      url.search ||
      url.hash ||
      (process.env.NODE_ENV === 'production' && url.protocol !== 'https:')
    ) {
      throw new ServiceUnavailableException(
        'Recuperação de senha temporariamente indisponível.',
      );
    }
    if (
      process.env.SMTP_SECURE &&
      !['true', 'false'].includes(process.env.SMTP_SECURE)
    )
      throw new ServiceUnavailableException(
        'Recuperação de senha temporariamente indisponível.',
      );
    return {
      secure: process.env.SMTP_SECURE
        ? process.env.SMTP_SECURE === 'true'
        : port === 465,
      host: SMTP_HOST,
      port,
      user: SMTP_USER,
      pass: SMTP_PASS,
      from: SMTP_FROM,
      url,
    };
  }

  async send(to: string, token: string): Promise<void> {
    const config = this.configuration();
    config.url.hash = new URLSearchParams({ token }).toString();
    const transport = createTransport({
      host: config.host,
      port: config.port,
      secure: config.secure,
      requireTLS: true,
      auth: { user: config.user, pass: config.pass },
      tls: { minVersion: 'TLSv1.2', rejectUnauthorized: true },
      connectionTimeout: 10000,
      greetingTimeout: 10000,
      socketTimeout: 20000,
      disableFileAccess: true,
      disableUrlAccess: true,
    });
    try {
      await transport.sendMail({
        from: config.from,
        to,
        subject: 'Redefina sua senha da Pokédex',
        text: `Recebemos uma solicitação para redefinir sua senha da Pokédex.\n\nUse este link em até 15 minutos:\n${config.url.toString()}\n\nO link só pode ser usado uma vez. Se você não fez esta solicitação, ignore esta mensagem.`,
      });
    } finally {
      transport.close();
    }
  }
}
