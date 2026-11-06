import { PasswordBytes } from '../auth/password-policy';
import { Trim } from './input-transforms';
import { IsEmail, IsString, Length, MinLength } from 'class-validator';
export class CreateUserDTO {
  @IsString() @Length(3, 100) @Trim() name: string = '';
  @IsEmail() email: string = '';
  @IsString() @MinLength(6) @PasswordBytes() passwordHash: string = '';
}
