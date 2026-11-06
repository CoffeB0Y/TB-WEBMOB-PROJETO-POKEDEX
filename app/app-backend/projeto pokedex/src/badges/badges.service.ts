import {
  ForbiddenException,
  Injectable,
  NotFoundException,
  OnModuleInit,
} from '@nestjs/common';
import { PrismaService } from '../database/prisma.service';
import { ProgressionService } from '../progression/progression.service';
import type { Prisma } from '../../prisma/generated/prisma/client';
import { BADGE_RULES } from './badge-rules';
@Injectable()
export class BadgesService implements OnModuleInit {
  constructor(
    private readonly prisma: PrismaService,
    private readonly progression: ProgressionService,
  ) {}
  async onModuleInit() {
    for (const rule of BADGE_RULES)
      await this.prisma.badge.upsert({
        where: {
          region_badgeNumber: { region: 'Kanto', badgeNumber: rule.number },
        },
        create: {
          name: rule.name,
          description: rule.description,
          region: 'Kanto',
          badgeNumber: rule.number,
        },
        update: { name: rule.name, description: rule.description },
      });
  }
  findAll() {
    return this.prisma.badge.findMany({
      orderBy: [{ region: 'asc' }, { badgeNumber: 'asc' }],
    });
  }
  async findOne(id: number) {
    const badge = await this.prisma.badge.findUnique({ where: { id } });
    if (!badge) throw new NotFoundException('Insígnia não encontrada.');
    return badge;
  }
  findTrainerBadges(userId: number) {
    return this.prisma.trainerBadge.findMany({
      where: { userId },
      include: { badge: true },
      orderBy: { obtainedAt: 'asc' },
    });
  }
  private async state(userId: number, client: Prisma.TransactionClient) {
    const captures = await client.capturedPokemon.findMany({
      where: { userId },
      include: { pokemon: true },
    });
    const earned = await client.trainerBadge.findMany({
      where: { userId },
      include: { badge: true },
    });
    const countType = (type: string) =>
      new Set(
        captures
          .filter(
            (item) => item.pokemon.type === type || item.pokemon.type2 === type,
          )
          .map((item) => item.pokemonId),
      ).size;
    return {
      captures: captures.length,
      water: countType('water'),
      electric: countType('electric'),
      grass: countType('grass'),
      fire: countType('fire'),
      level: Math.floor((captures.length * 10 + earned.length * 50) / 100) + 1,
      kanto: new Set(
        captures
          .filter(
            (item) =>
              item.pokemon.pokedexNumber <= 151 &&
              item.pokemon.pokedexNumber >= 1,
          )
          .map((item) => item.pokemonId),
      ).size,
      earned,
    };
  }
  async evaluate(
    userId: number,
    client: Prisma.TransactionClient = this.prisma,
  ) {
    // Repete para permitir que o XP de uma nova insígnia desbloqueie uma meta de nível.
    for (let pass = 0; pass < 2; pass++) {
      const state = await this.state(userId, client);
      for (const rule of BADGE_RULES) {
        if (state[rule.metric] < rule.target) continue;
        const badge = await client.badge.findUnique({
          where: {
            region_badgeNumber: { region: 'Kanto', badgeNumber: rule.number },
          },
        });
        if (badge)
          await client.trainerBadge.upsert({
            where: { userId_badgeId: { userId, badgeId: badge.id } },
            create: { userId, badgeId: badge.id },
            update: {},
          });
      }
    }
    return this.progression.updateTrainerProgress(userId, client);
  }
  async getProgress(userId: number) {
    const state = await this.state(userId, this.prisma);
    const badges = await this.findAll();
    return badges
      .filter((b) => b.region === 'Kanto')
      .map((badge) => {
        const rule = BADGE_RULES.find((r) => r.number === badge.badgeNumber)!;
        const earned = state.earned.find((item) => item.badgeId === badge.id);
        return {
          ...badge,
          current: state[rule.metric],
          target: rule.target,
          unlocked: !!earned,
          obtainedAt: earned?.obtainedAt ?? null,
        };
      });
  }
  claimBadge() {
    throw new ForbiddenException(
      'As insígnias são concedidas automaticamente ao cumprir suas metas.',
    );
  }
  removeBadge() {
    throw new ForbiddenException(
      'Conquistas não podem ser removidas manualmente.',
    );
  }
}
