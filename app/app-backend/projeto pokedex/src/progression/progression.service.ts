import type { Prisma } from '../../prisma/generated/prisma/client';
import { Injectable, NotFoundException } from '@nestjs/common';

import { PrismaService } from '../database/prisma.service';

@Injectable()
export class ProgressionService {
  private readonly XP_PER_POKEMON = 10;
  private readonly XP_PER_BADGE = 50;
  private readonly XP_PER_LEVEL = 100;

  constructor(private readonly prisma: PrismaService) {}

  async updateTrainerProgress(
    userId: number,
    client: Prisma.TransactionClient = this.prisma,
  ) {
    const user = await client.user.findUnique({
      where: {
        id: userId,
      },
      include: {
        _count: {
          select: {
            capturedPokemon: true,
            trainerBadges: true,
          },
        },
      },
    });

    if (!user) {
      throw new NotFoundException('Treinador não encontrado.');
    }

    const pokemonXP = user._count.capturedPokemon * this.XP_PER_POKEMON;

    const badgeXP = user._count.trainerBadges * this.XP_PER_BADGE;

    const experience = pokemonXP + badgeXP;

    const level = Math.floor(experience / this.XP_PER_LEVEL) + 1;

    const profile = await client.profile.upsert({
      create: { userId, fullName: user.name, trainerLevel: level },
      where: {
        userId,
      },
      update: {
        trainerLevel: level,
      },
    });

    return {
      userId,
      experience,
      level,
      pokemonCaptured: user._count.capturedPokemon,
      badges: user._count.trainerBadges,
      nextLevelExperience: level * this.XP_PER_LEVEL,
      profile,
    };
  }

  async getTrainerProgress(userId: number) {
    const user = await this.prisma.user.findUnique({
      where: {
        id: userId,
      },
      include: {
        profile: true,
        capturedPokemon: { select: { captureDate: true } },
        trainerBadges: { select: { obtainedAt: true } },
        _count: {
          select: {
            capturedPokemon: true,
            teams: true,
            trainerBadges: true,
          },
        },
      },
    });

    if (!user) {
      throw new NotFoundException('Treinador não encontrado.');
    }

    const pokemonXP = user._count.capturedPokemon * this.XP_PER_POKEMON;

    const badgeXP = user._count.trainerBadges * this.XP_PER_BADGE;

    const experience = pokemonXP + badgeXP;

    const level = Math.floor(experience / this.XP_PER_LEVEL) + 1;

    const currentLevelXP = (level - 1) * this.XP_PER_LEVEL;

    const nextLevelXP = level * this.XP_PER_LEVEL;

    const now = new Date();
    const monthlyExperience = Array.from({ length: 6 }, (_, index) => {
      const date = new Date(
        Date.UTC(now.getUTCFullYear(), now.getUTCMonth() - 5 + index, 1),
      );
      const month = date.toISOString().slice(0, 7);
      const xp =
        user.capturedPokemon.filter((item) =>
          item.captureDate.toISOString().startsWith(month),
        ).length *
          10 +
        user.trainerBadges.filter((item) =>
          item.obtainedAt.toISOString().startsWith(month),
        ).length *
          50;
      return { month, experience: xp };
    });
    return {
      monthlyExperience,
      teams: user._count.teams,
      userId: user.id,
      trainerName: user.name,
      level,
      experience,
      experienceInCurrentLevel: experience - currentLevelXP,
      experienceForNextLevel: nextLevelXP - currentLevelXP,
      pokemonCaptured: user._count.capturedPokemon,
      badges: user._count.trainerBadges,
    };
  }
}
