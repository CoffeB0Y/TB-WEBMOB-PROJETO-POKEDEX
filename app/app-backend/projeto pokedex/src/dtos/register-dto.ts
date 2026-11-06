import { PasswordBytes } from '../auth/password-policy';
import { Trim } from './input-transforms';
import {
  IsEmail,
  IsString,
  Length,
  MinLength,
  ValidateIf,
} from 'class-validator';
export class RegisterDto {
  @IsString() @Length(3, 100) @Trim() name: string = '';
  @IsEmail() email: string = '';
  @ValidateIf(
    (dto: RegisterDto) =>
      dto.password !== undefined || dto.passwordHash === undefined,
  )
  @IsString()
  @MinLength(6)
  @PasswordBytes()
  password?: string;
  // Compatibilidade com o contrato anterior; o valor recebido ainda e uma senha, nunca um hash confiavel.
  @ValidateIf(
    (dto: RegisterDto) =>
      dto.passwordHash !== undefined || dto.password === undefined,
  )
  @IsString()
  @MinLength(6)
  @PasswordBytes()
  passwordHash?: string;
}
