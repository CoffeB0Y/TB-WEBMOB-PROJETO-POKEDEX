import { TeamDto } from '../dtos/team-dto';
import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../database/prisma.service';
@Injectable()
export class TeamsService {
  constructor(private readonly prisma: PrismaService) {}
  async create(userId: number, input: TeamDto) {
    return this.save(userId, undefined, input);
  }
  private async save(userId: number, id: number | undefined, input: TeamDto) {
    return this.prisma.$transaction(async (tx) => {
      if (
        id !== undefined &&
        !(await tx.team.findFirst({ where: { id, userId } }))
      )
        throw new NotFoundException('Equipe não encontrada.');
      const ids = input.capturedPokemonIds;
      if (ids && (ids.length > 6 || new Set(ids).size !== ids.length))
        throw new BadRequestException(
          'Selecione até seis capturas diferentes.',
        );
      if (
        ids &&
        (await tx.capturedPokemon.count({
          where: { id: { in: ids }, userId },
        })) !== ids.length
      )
        throw new NotFoundException(
          'Selecione somente Pokémon da sua coleção.',
        );
      if (input.isActive)
        await tx.team.updateMany({
          where: { userId, isActive: true },
          data: { isActive: false },
        });
      const data = {
        name: input.name,
        description: input.description,
        isActive: input.isActive,
      };
      const team =
        id !== undefined
          ? await tx.team.update({ where: { id, userId }, data })
          : await tx.team.create({ data: { ...data, userId } });
      if (ids) {
        await tx.teamPokemon.deleteMany({ where: { teamId: team.id } });
        await tx.teamPokemon.createMany({
          data: ids.map((capturedPokemonId, index) => ({
            teamId: team.id,
            capturedPokemonId,
            position: index + 1,
          })),
        });
      }
      return team;
    });
  }
  findAll(userId: number) {
    return this.prisma.team.findMany({
      where: { userId },
      include: {
        teamPokemon: {
          orderBy: { position: 'asc' },
          include: { capturedPokemon: { include: { pokemon: true } } },
        },
      },
      orderBy: { createdAt: 'desc' },
    });
  }
  async findOne(userId: number, id: number) {
    const team = await this.prisma.team.findFirst({
      where: { id, userId },
      include: {
        teamPokemon: {
          orderBy: { position: 'asc' },
          include: { capturedPokemon: { include: { pokemon: true } } },
        },
      },
    });
    if (!team) throw new NotFoundException('Equipe não encontrada.');
    return team;
  }
  async addPokemon(
    userId: number,
    id: number,
    capturedPokemonId: number,
    position: number,
  ) {
    return this.prisma.$transaction(async (tx) => {
      const team = await tx.team.findFirst({
        where: { id, userId },
        include: { teamPokemon: true },
      });
      if (!team) throw new NotFoundException('Equipe não encontrada.');
      if (
        !Number.isInteger(position) ||
        position < 1 ||
        position > 6 ||
        team.teamPokemon.length >= 6
      )
        throw new BadRequestException(
          'Uma equipe admite até seis Pokémon, nas posições 1 a 6.',
        );
      const capture = await tx.capturedPokemon.findFirst({
        where: { id: capturedPokemonId, userId },
      });
      if (!capture)
        throw new NotFoundException('Captura não encontrada na sua coleção.');
      if (
        team.teamPokemon.some(
          (member) =>
            member.capturedPokemonId === capturedPokemonId ||
            member.position === position,
        )
      )
        throw new BadRequestException(
          'Pokémon ou posição já presente na equipe.',
        );
      return tx.teamPokemon.create({
        data: { teamId: id, capturedPokemonId, position },
      });
    });
  }
  async removePokemon(userId: number, id: number, pokemonId: number) {
    await this.findOne(userId, id);
    return this.prisma.teamPokemon.deleteMany({
      where: { teamId: id, capturedPokemonId: pokemonId, team: { userId } },
    });
  }
  async updateTeam(userId: number, id: number, input: TeamDto) {
    return this.save(userId, id, input);
  }
  async removeTeam(userId: number, id: number) {
    await this.findOne(userId, id);
    return this.prisma.team.delete({ where: { id, userId } });
  }
}
