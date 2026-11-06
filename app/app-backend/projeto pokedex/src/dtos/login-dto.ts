import { PasswordBytes } from '../auth/password-policy';
import { OptionalInput } from './input-transforms';
import { IsBoolean, IsEmail, IsString } from 'class-validator';
export class LoginDto {
  @OptionalInput() @IsBoolean() rememberMe?: boolean;
  @IsEmail() email: string = '';
  @IsString() @PasswordBytes() password: string = '';
}
