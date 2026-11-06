import {
  Injectable,
  NotFoundException,
  ServiceUnavailableException,
} from '@nestjs/common';
import axios from 'axios';

export interface PokeApiPokemon {
  id: number;
  name: string;
  height: number;
  weight: number;
  types: { type: { name: string } }[];
  abilities: { ability: { name: string } }[];
  stats: { base_stat: number; stat: { name: string } }[];
  sprites: {
    front_default: string | null;
    other?: { 'official-artwork'?: { front_default: string | null } };
  };
  cries?: { latest?: string };
  species: { name: string };
}
interface Species {
  is_legendary: boolean;
  evolution_chain: { url: string } | null;
  flavor_text_entries: { flavor_text: string; language: { name: string } }[];
}
interface Evolution {
  species: { name: string; url: string };
  evolves_to: Evolution[];
}
@Injectable()
export class PokeApiService {
  private readonly baseUrl = 'https://pokeapi.co/api/v2';

  private readonly cache = new Map<
    string,
    { expires: number; data: unknown }
  >();
  private async get<T>(path: string): Promise<T> {
    const cached = this.cache.get(path);
    if (cached && cached.expires > Date.now()) return cached.data as T;
    try {
      const { data } = await axios.get<T>(`${this.baseUrl}/${path}`, {
        timeout: 15000,
      });
      if (this.cache.size >= 512) {
        const oldest: unknown = this.cache.keys().next().value;
        if (typeof oldest === 'string') this.cache.delete(oldest);
      }
      this.cache.set(path, { data, expires: Date.now() + 300000 });
      return data;
    } catch (error) {
      if (axios.isAxiosError(error) && error.response?.status === 404)
        throw new NotFoundException(
          'Pokémon ou recurso não encontrado na PokéAPI.',
        );
      throw new ServiceUnavailableException(
        'Não foi possível consultar a PokéAPI. Tente novamente.',
      );
    }
  }
  getPokemon(identifier: string | number) {
    const normalized = String(identifier).trim().toLowerCase();
    if (!/^[a-z0-9-]{1,80}$/.test(normalized))
      throw new NotFoundException('Identificador inválido.');
    return this.get<PokeApiPokemon>(`pokemon/${normalized}`);
  }
  private summary(data: PokeApiPokemon) {
    return {
      name: data.name,
      pokedexNumber: data.id,
      type: data.types[0]?.type.name ?? 'unknown',
      type2: data.types[1]?.type.name ?? null,
      spriteUrl:
        data.sprites.other?.['official-artwork']?.front_default ??
        data.sprites.front_default,
    };
  }
  async getCatalog(search = '', type = '', sort = 'number', page = 1) {
    const list = await this.get<{ results: { name: string; url: string }[] }>(
      'pokemon?limit=151',
    );
    let entries = list.results.map((item) => ({
      name: item.name,
      id: Number(item.url.split('/').filter(Boolean).pop()),
    }));
    if (type) {
      if (!/^[a-z-]{1,20}$/.test(type))
        throw new NotFoundException('Tipo inválido.');
      const result = await this.get<{
        pokemon: { pokemon: { name: string } }[];
      }>(`type/${type}`);
      const names = new Set(result.pokemon.map((item) => item.pokemon.name));
      entries = entries.filter((item) => names.has(item.name));
    }
    const query = search.trim().toLowerCase().replace(/^#/, '');
    entries = entries.filter(
      (item) =>
        item.name.includes(query) ||
        (query !== '' && item.id === Number(query)),
    );
    entries.sort((a, b) =>
      sort === 'name'
        ? a.name.localeCompare(b.name)
        : sort === 'number-desc'
          ? b.id - a.id
          : a.id - b.id,
    );
    const total = entries.length;
    const pages = Math.max(1, Math.ceil(total / 12));
    const currentPage = Math.min(Math.max(1, page), pages);
    const results = await Promise.all(
      entries
        .slice((currentPage - 1) * 12, currentPage * 12)
        .map(async (item) => this.summary(await this.getPokemon(item.id))),
    );
    return { results, total, page: currentPage, pages };
  }
  async getDetails(identifier: string) {
    const data = await this.getPokemon(identifier);
    const species = await this.get<Species>(
      `pokemon-species/${data.species.name}`,
    );
    const description =
      species.flavor_text_entries.find((item) => item.language.name === 'pt') ??
      species.flavor_text_entries.find((item) => item.language.name === 'en');
    const evolutions: {
      name: string;
      pokedexNumber: number;
      spriteUrl: string | null;
      evolvesFrom: string | null;
    }[] = [];
    if (species.evolution_chain) {
      const id = species.evolution_chain.url.split('/').filter(Boolean).pop();
      const { chain } = await this.get<{ chain: Evolution }>(
        `evolution-chain/${id}`,
      );
      const visit = async (
        node: Evolution,
        parent: string | null = null,
      ): Promise<void> => {
        const pokemon = await this.getPokemon(node.species.name);
        const summary = this.summary(pokemon);
        evolutions.push({
          name: summary.name,
          pokedexNumber: summary.pokedexNumber,
          spriteUrl: summary.spriteUrl,
          evolvesFrom: parent,
        });
        for (const child of node.evolves_to) await visit(child, summary.name);
      };
      await visit(chain);
    }
    return {
      ...this.summary(data),
      height: data.height,
      weight: data.weight,
      ability: data.abilities.map((item) => item.ability.name).join(', '),
      description: description?.flavor_text.replace(/[\n\f\r]/g, ' ') ?? null,
      legendary: species.is_legendary,
      stats: data.stats.map((item) => ({
        name: item.stat.name,
        value: item.base_stat,
      })),
      evolutions,
      cryUrl: data.cries?.latest ?? null,
    };
  }
}
