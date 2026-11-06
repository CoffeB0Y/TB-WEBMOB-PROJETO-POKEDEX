import { Module } from '@nestjs/common';
import { PokemonController } from './pokemon.controller';
import { PokemonService } from './pokemon.service';
import { PokeApiService } from './pokeapi.service';

import { DatabaseModule } from '../database/database.module';
@Module({
  imports: [DatabaseModule],
  controllers: [PokemonController],
  providers: [PokemonService, PokeApiService],
})
export class PokemonModule {}
