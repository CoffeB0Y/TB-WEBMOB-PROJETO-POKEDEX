import { Injectable } from '@nestjs/common';

import { PrismaService } from '../database/prisma.service';

@Injectable()
export class LeaderboardService {
  constructor(private readonly prisma: PrismaService) {}

  async getLeaderboard() {
    const users = await this.prisma.user.findMany({
      include: {
        profile: true,
        _count: {
          select: {
            capturedPokemon: true,
            trainerBadges: true,
          },
        },
      },
    });

    const leaderboard = users.map((user) => {
      const pokemonCaptured = user._count.capturedPokemon;

      const badges = user._count.trainerBadges;

      const experience = pokemonCaptured * 10 + badges * 50;

      const level = Math.floor(experience / 100) + 1;

      return {
        userId: user.id,
        trainerName: user.profile?.trainerName ?? user.name,

        level,
        experience,
        pokemonCaptured,
        badges,

        score: experience,
      };
    });

    return leaderboard.sort((a, b) => b.score - a.score);
  }

  async updateTrainerLevel(userId: number) {
    const user = await this.prisma.user.findUnique({
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
      return;
    }

    const experience =
      user._count.capturedPokemon * 10 + user._count.trainerBadges * 50;

    const level = Math.floor(experience / 100) + 1;

    return this.prisma.profile.update({
      where: {
        userId,
      },
      data: {
        trainerLevel: level,
      },
    });
  }
}
