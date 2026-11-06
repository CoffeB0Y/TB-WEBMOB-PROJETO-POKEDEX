import type { Pokemon } from '../../prisma/generated/prisma/client';
import { Injectable } from '@nestjs/common';
import { PokeApiService } from './pokeapi.service';
import { PrismaService } from '../database/prisma.service';

@Injectable()
export class PokemonService {
  constructor(
    private readonly pokeApiService: PokeApiService,
    private readonly prisma: PrismaService,
  ) {}

  async findOne(identifier: string) {
    const details = await this.pokeApiService.getDetails(identifier);
    const local = await this.prisma.pokemon.findUnique({
      where: { pokedexNumber: details.pokedexNumber },
    });
    return { ...details, id: local?.id ?? null };
  }

  getCatalog(search?: string, type?: string, sort?: string, page?: number) {
    return this.pokeApiService.getCatalog(search, type, sort, page);
  }

  async syncPokemon(identifier: string) {
    const data = await this.pokeApiService.getPokemon(identifier);

    const types = data.types ?? [];

    const type = types[0]?.type?.name ?? 'unknown';
    const type2 = types[1]?.type?.name ?? null;

    const ability = data.abilities?.[0]?.ability?.name ?? null;

    const pokemon = await this.prisma.pokemon.upsert({
      where: {
        pokedexNumber: data.id,
      },
      update: {
        name: data.name,
        type,
        type2,
        height: data.height,
        weight: data.weight,
        ability,
        spriteUrl: data.sprites?.front_default ?? null,
        cryUrl: data.cries?.latest ?? null,
      },
      create: {
        name: data.name,
        pokedexNumber: data.id,
        type,
        type2,
        height: data.height,
        weight: data.weight,
        ability,
        legendary: false,
        spriteUrl: data.sprites?.front_default ?? null,
        cryUrl: data.cries?.latest ?? null,
      },
    });

    return pokemon;
  }

  async syncMultiple(limit: number = 151) {
    const results: Pokemon[] = [];

    for (let id = 1; id <= limit; id++) {
      try {
        const data = await this.pokeApiService.getPokemon(id);

        const types = data.types ?? [];

        const type = types[0]?.type?.name ?? 'unknown';
        const type2 = types[1]?.type?.name ?? null;

        const ability = data.abilities?.[0]?.ability?.name ?? null;

        const pokemon = await this.prisma.pokemon.upsert({
          where: {
            pokedexNumber: data.id,
          },

          update: {
            name: data.name,
            type,
            type2,
            height: data.height,
            weight: data.weight,
            ability,
            spriteUrl: data.sprites?.front_default ?? null,
            cryUrl: data.cries?.latest ?? null,
          },

          create: {
            name: data.name,
            pokedexNumber: data.id,
            type,
            type2,
            height: data.height,
            weight: data.weight,
            ability,
            legendary: false,
            spriteUrl: data.sprites?.front_default ?? null,
            cryUrl: data.cries?.latest ?? null,
          },
        });

        results.push(pokemon);
      } catch (error) {
        console.error(`Erro ao sincronizar Pokémon ${id}`, error);
      }
    }

    return {
      imported: results.length,
      pokemon: results,
    };
  }

  async findAll() {
    return this.prisma.pokemon.findMany({
      orderBy: {
        pokedexNumber: 'asc',
      },
    });
  }
}
