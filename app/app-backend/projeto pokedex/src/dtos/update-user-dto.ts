import { Trim } from './input-transforms';
import { OptionalInput } from './input-transforms';
import { IsEmail, IsString, Length } from 'class-validator';
export class UpdateUserDto {
  @OptionalInput() @IsString() @Length(3, 100) @Trim() name?: string;
  @OptionalInput() @IsEmail() email?: string;
  // Mantido por compatibilidade com o formulario existente; nao altera senha.
  @OptionalInput() @IsString() passwordHash?: string;
}
