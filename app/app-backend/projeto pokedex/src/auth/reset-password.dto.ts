import { IsEmail, IsString, Length, Matches } from 'class-validator';
import { PasswordBytes } from './password-policy';

export class ForgotPasswordDto {
  @IsEmail()
  email!: string;
}

export class ResetPasswordDto {
  @IsString()
  @Matches(/^[a-f0-9]{64}$/)
  token!: string;

  @IsString()
  @Length(8, 72)
  @PasswordBytes()
  password!: string;
}
