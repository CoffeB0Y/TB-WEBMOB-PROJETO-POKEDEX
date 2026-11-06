import { jest } from '@jest/globals';
import { HttpException } from '@nestjs/common';
import { ResetRateLimitService } from './reset-rate-limit.service';

describe('Limites da recuperação', () => {
  afterEach(() => jest.restoreAllMocks());

  it('bloqueia repetição e permite nova solicitação ao terminar a janela', () => {
    const clock = jest.spyOn(Date, 'now').mockReturnValue(1000);
    const limits = new ResetRateLimitService();
    limits.consume('email', 'fixture@example.test', 1, 60000);
    expect(() =>
      limits.consume('email', 'fixture@example.test', 1, 60000),
    ).toThrow(HttpException);
    clock.mockReturnValue(61000);
    expect(() =>
      limits.consume('email', 'fixture@example.test', 1, 60000),
    ).not.toThrow();
  });

  it('mantém limites independentes por valor e por operação', () => {
    const limits = new ResetRateLimitService();
    limits.consume('request-ip', '127.0.0.1', 1, 60000);
    expect(() => limits.consume('request-ip', '127.0.0.1', 1, 60000)).toThrow(
      HttpException,
    );
    expect(() =>
      limits.consume('request-ip', '127.0.0.2', 1, 60000),
    ).not.toThrow();
    expect(() =>
      limits.consume('reset-ip', '127.0.0.1', 1, 60000),
    ).not.toThrow();
  });
});
