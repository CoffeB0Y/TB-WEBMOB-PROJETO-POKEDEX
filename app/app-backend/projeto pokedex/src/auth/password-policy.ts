import { BadRequestException } from '@nestjs/common';
import { registerDecorator } from 'class-validator';

export const PASSWORD_MAX_BYTES = 72;
export const PASSWORD_LIMIT_MESSAGE =
  'A senha deve ter no máximo 72 bytes em UTF-8. Senhas antigas acima desse limite precisam ser redefinidas.';

export function assertPasswordBytes(password: string): void {
  if (Buffer.byteLength(password, 'utf8') > PASSWORD_MAX_BYTES) {
    throw new BadRequestException(PASSWORD_LIMIT_MESSAGE);
  }
}

export function PasswordBytes(): PropertyDecorator {
  return (target, propertyKey) =>
    registerDecorator({
      name: 'passwordBytes',
      target: target.constructor,
      propertyName: String(propertyKey),
      options: { message: PASSWORD_LIMIT_MESSAGE },
      validator: {
        validate: (value: unknown) =>
          typeof value === 'string' &&
          Buffer.byteLength(value, 'utf8') <= PASSWORD_MAX_BYTES,
      },
    });
}
