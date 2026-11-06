import { BadRequestException } from '@nestjs/common';
import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';
import bcrypt from 'bcryptjs';
import { assertPasswordBytes } from './password-policy';
import { RegisterDto } from '../dtos/register-dto';
import { LoginDto } from '../dtos/login-dto';
import { CreateUserDTO } from '../dtos/create-users-dto';
import { ResetPasswordDto } from './reset-password.dto';

describe('Limite bcrypt em bytes UTF-8', () => {
  it('aceita exatamente 72 bytes ASCII ou multibyte', () => {
    expect(() => assertPasswordBytes('a'.repeat(72))).not.toThrow();
    expect(() => assertPasswordBytes('é'.repeat(36))).not.toThrow();
  });
  it('rejeita ambas as senhas que só diferem após o byte 72', async () => {
    const prefix = 'a'.repeat(72);
    const hash = await bcrypt.hash(prefix, 4);
    // Evidência da limitação na biblioteca: a política deve impedir a comparação.
    expect(await bcrypt.compare(prefix + 'X', hash)).toBe(true);
    for (const password of [prefix + 'X', prefix + 'Y', 'é'.repeat(37)]) {
      expect(() => assertPasswordBytes(password)).toThrow(BadRequestException);
    }
  });
  it('preserva a comparação com hashes bcrypt anteriores dentro do limite', async () => {
    const hash = await bcrypt.hash('Senha-legada-123', 4);
    assertPasswordBytes('Senha-legada-123');
    expect(await bcrypt.compare('Senha-legada-123', hash)).toBe(true);
    expect(await bcrypt.compare('Senha-errada-123', hash)).toBe(false);
  });
  it('aplica a política no cadastro, login, criação legada e redefinição', async () => {
    const password = 'é'.repeat(37);
    const common = {
      name: 'Treinador',
      email: 'test@example.test',
      password,
      passwordHash: password,
      token: 'a'.repeat(64),
    };
    for (const dto of [
      plainToInstance(RegisterDto, common),
      plainToInstance(LoginDto, common),
      plainToInstance(CreateUserDTO, common),
      plainToInstance(ResetPasswordDto, common),
    ]) {
      const errors = await validate(dto);
      expect(
        errors.some((error) =>
          Object.hasOwn(error.constraints ?? {}, 'passwordBytes'),
        ),
      ).toBe(true);
    }
  });
});
