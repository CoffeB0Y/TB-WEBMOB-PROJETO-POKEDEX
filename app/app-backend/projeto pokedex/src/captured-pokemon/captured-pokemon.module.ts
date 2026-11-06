import { BadgesModule } from '../badges/badges.module';
import { Module } from '@nestjs/common';

import { CapturedPokemonController } from './captured-pokemon.controller';
import { CapturedPokemonService } from './captured-pokemon.service';
import { DatabaseModule } from '../database/database.module';
import { ProgressionModule } from '../progression/progression.module';

@Module({
  imports: [DatabaseModule, BadgesModule, ProgressionModule],
  controllers: [CapturedPokemonController],
  providers: [CapturedPokemonService],
})
export class CapturedPokemonModule {}
