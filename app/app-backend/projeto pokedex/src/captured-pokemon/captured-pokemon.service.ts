import { BadgesService } from '../badges/badges.service';
import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';

import { PrismaService } from '../database/prisma.service';
import { ProgressionService } from '../progression/progression.service';
import { parseDate } from '../dtos/parse-date';
@Injectable()
export class CapturedPokemonService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly badges: BadgesService,
    private readonly progressionService: ProgressionService,
  ) {}

  async create(
    userId: number,
    pokemonId: number,
    nickname?: string,
    level: number = 1,
    captureLocation?: string,
    captureDate?: string,
    notes?: string,
  ) {
    return this.prisma.$transaction(async (tx) => {
      if (!(await tx.pokemon.findUnique({ where: { id: pokemonId } })))
        throw new NotFoundException('Espécie não encontrada.');
      const capture = await tx.capturedPokemon.create({
        data: {
          userId,
          pokemonId,
          nickname,
          level,
          captureLocation,
          notes,
          captureDate: captureDate ? parseDate(captureDate) : undefined,
        },
        include: { pokemon: true },
      });
      await this.badges.evaluate(userId, tx);
      return capture;
    });
  }

  async findAllByUser(userId: number) {
    return this.prisma.capturedPokemon.findMany({
      where: {
        userId,
      },
      include: {
        pokemon: true,
        teamPokemon: {
          include: {
            team: true,
          },
        },
      },
      orderBy: {
        captureDate: 'desc',
      },
    });
  }

  async findOne(id: number, userId: number) {
    const capturedPokemon = await this.prisma.capturedPokemon.findFirst({
      where: {
        id,
        userId,
      },
      include: {
        pokemon: true,
        teamPokemon: {
          include: {
            team: true,
          },
        },
      },
    });

    if (!capturedPokemon) {
      throw new NotFoundException('Pokémon capturado não encontrado.');
    }

    return capturedPokemon;
  }

  async update(
    id: number,
    userId: number,
    data: {
      nickname?: string;
      level?: number;
      captureLocation?: string;
      captureDate?: string;
      notes?: string;
      isFavorite?: boolean;
      hp?: number;
      attack?: number;
      defense?: number;
      specialAttack?: number;
      specialDefense?: number;
      speed?: number;
    },
  ) {
    await this.findOne(id, userId);

    if (data.level !== undefined && (data.level < 1 || data.level > 100)) {
      throw new BadRequestException(
        'O nível do Pokémon deve estar entre 1 e 100.',
      );
    }

    return this.prisma.capturedPokemon.update({
      where: {
        id,
      },
      data: {
        ...data,
        captureDate:
          data.captureDate === undefined
            ? undefined
            : parseDate(data.captureDate),
      },
      include: {
        pokemon: true,
      },
    });
  }

  async remove(id: number, userId: number) {
    await this.findOne(id, userId);

    return this.prisma.$transaction(async (tx) => {
      const capture = await tx.capturedPokemon.delete({
        where: { id, userId },
      });
      await this.badges.evaluate(userId, tx);
      return capture;
    });
  }
}
