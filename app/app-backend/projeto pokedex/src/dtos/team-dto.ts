import { Trim } from './input-transforms';
import { OptionalInput } from './input-transforms';
import {
  ArrayMaxSize,
  ArrayUnique,
  IsArray,
  IsBoolean,
  IsInt,
  IsString,
  Length,
  Max,
  Min,
} from 'class-validator';
export class TeamDto {
  @IsString() @Length(1, 80) @Trim() name: string = '';
  @OptionalInput() @IsString() @Length(0, 500) description?: string;
  @OptionalInput() @IsBoolean() isActive?: boolean;
  @OptionalInput()
  @IsArray()
  @ArrayMaxSize(6)
  @ArrayUnique()
  @IsInt({ each: true })
  @Min(1, { each: true })
  capturedPokemonIds?: number[];
}
export class TeamMemberDto {
  @IsInt() @Min(1) capturedPokemonId: number = 0;
  @IsInt() @Min(1) @Max(6) position: number = 1;
}
