import { OptionalInput } from './input-transforms';
import {
  IsBoolean,
  IsDateString,
  IsInt,
  IsString,
  Length,
  Max,
  Min,
} from 'class-validator';
export class CreateCapturedPokemonDto {
  @IsInt() @Min(1) pokemonId: number = 0;
  @OptionalInput() @IsString() @Length(0, 80) nickname?: string;
  @OptionalInput() @IsInt() @Min(1) @Max(100) level?: number;
  @OptionalInput() @IsString() @Length(0, 200) captureLocation?: string;
  @OptionalInput() @IsDateString({ strict: true }) captureDate?: string;
  @OptionalInput() @IsString() @Length(0, 1000) notes?: string;
}
export class UpdateCapturedPokemonDto {
  @OptionalInput() @IsString() @Length(0, 80) nickname?: string;
  @OptionalInput() @IsInt() @Min(1) @Max(100) level?: number;
  @OptionalInput() @IsString() @Length(0, 200) captureLocation?: string;
  @OptionalInput() @IsDateString({ strict: true }) captureDate?: string;
  @OptionalInput() @IsString() @Length(0, 1000) notes?: string;
  @OptionalInput() @IsBoolean() isFavorite?: boolean;
  @OptionalInput() @IsInt() @Min(0) hp?: number;
  @OptionalInput() @IsInt() @Min(0) attack?: number;
  @OptionalInput() @IsInt() @Min(0) defense?: number;
  @OptionalInput() @IsInt() @Min(0) specialAttack?: number;
  @OptionalInput() @IsInt() @Min(0) specialDefense?: number;
  @OptionalInput() @IsInt() @Min(0) speed?: number;
}
