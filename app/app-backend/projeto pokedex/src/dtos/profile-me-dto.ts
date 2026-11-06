import { Trim } from './input-transforms';
import { OptionalInput } from './input-transforms';
import { IsEmail, IsString, IsUrl, Length, Matches } from 'class-validator';
export class ProfileMeDto {
  @IsString() @Length(3, 100) @Trim() trainerName: string = '';
  @IsEmail() email: string = '';
  @OptionalInput()
  @IsString()
  @Length(3, 30)
  @Matches(/^[a-zA-Z0-9_]+$/)
  username?: string;
  @OptionalInput() @IsString() @Length(0, 1000) bio?: string;
  @OptionalInput()
  @IsUrl({ protocols: ['http', 'https'], require_protocol: true })
  avatarUrl?: string;
}
