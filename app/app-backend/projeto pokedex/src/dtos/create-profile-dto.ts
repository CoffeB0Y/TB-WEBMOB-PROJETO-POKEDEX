import { Trim } from './input-transforms';
import { OptionalInput } from './input-transforms';
import {
  IsInt,
  IsPositive,
  IsString,
  Length,
  IsDateString,
  MaxLength,
} from 'class-validator';
export class CreateProfileDto {
  @IsInt()
  @IsPositive()
  userId: number = 0; // vínculo obrigatório

  @IsString()
  @Length(2, 120)
  @Trim()
  fullName: string = '';

  @OptionalInput()
  @IsDateString({ strict: true })
  birthDate?: string; // ISO 8601 (ex: "1990-01-15T00:00:00Z")

  @OptionalInput()
  @MaxLength(500)
  avatarUrl?: string;
}
