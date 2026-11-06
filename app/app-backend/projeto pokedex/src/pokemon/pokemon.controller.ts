import { Controller, Get, Param, Post, Query } from '@nestjs/common';
import { PokemonService } from './pokemon.service';
import { Public } from '../auth/public.decorator';

@Controller('pokemon')
export class PokemonController {
  constructor(private readonly pokemonService: PokemonService) {}

  @Get()
  @Public()
  findAll(
    @Query('source') source?: string,
    @Query('search') search?: string,
    @Query('type') type?: string,
    @Query('sort') sort?: string,
    @Query('page') page?: string,
  ) {
    return source === 'pokeapi'
      ? this.pokemonService.getCatalog(
          search,
          type,
          sort,
          Math.max(1, Number(page) || 1),
        )
      : this.pokemonService.findAll();
  }

  @Public()
  @Get(':identifier')
  async findOne(@Param('identifier') identifier: string) {
    return this.pokemonService.findOne(identifier);
  }

  @Post('sync/:identifier')
  async syncPokemon(@Param('identifier') identifier: string) {
    return this.pokemonService.syncPokemon(identifier);
  }

  @Post('sync')
  async syncAllPokemon() {
    return this.pokemonService.syncMultiple(151);
  }
}
