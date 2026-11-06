import { Trim } from './input-transforms';
import { OptionalInput } from './input-transforms';
import { IsString, Length, IsDateString, MaxLength } from 'class-validator';
export class UpdateProfileDto {
  @OptionalInput()
  @IsString()
  @Length(2, 120)
  @Trim()
  fullName?: string;

  @OptionalInput()
  @IsDateString({ strict: true })
  birthDate?: string;

  @OptionalInput()
  @MaxLength(500)
  avatarUrl?: string;
}
