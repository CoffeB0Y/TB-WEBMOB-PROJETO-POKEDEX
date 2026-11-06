import { ProfileMeDto } from '../dtos/profile-me-dto';
import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../database/prisma.service';
import { CreateProfileDto } from '../dtos/create-profile-dto';
import { UpdateProfileDto } from '../dtos/update-profile-dto';
import { rethrowAccountError, updateAccount } from '../database/account-data';
import { parseDate } from '../dtos/parse-date';

@Injectable()
export class ProfilesService {
  constructor(private prisma: PrismaService) {}

  async getMe(userId: number) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        name: true,
        email: true,
        createdAt: true,
        profile: true,
      },
    });
    if (!user) throw new NotFoundException('Treinador não encontrado.');
    return user;
  }
  async updateMe(userId: number, dto: ProfileMeDto) {
    try {
      return await this.prisma.$transaction(async (tx) => {
        const user = await updateAccount(tx, userId, {
          name: dto.trainerName,
          email: dto.email,
        });
        const data = {
          fullName: dto.trainerName,
          trainerName: dto.trainerName,
          username: dto.username || null,
          bio: dto.bio,
          avatarUrl: dto.avatarUrl || null,
        };
        const profile = await tx.profile.upsert({
          where: { userId },
          create: { ...data, userId },
          update: data,
        });
        return { ...user, profile };
      });
    } catch (error) {
      rethrowAccountError(error);
    }
  }
  async create(dto: CreateProfileDto) {
    const user = await this.prisma.user.findUnique({
      where: { id: dto.userId },
    });
    if (!user) {
      throw new BadRequestException('Usuário não existe.');
    }
    const existing = await this.prisma.profile.findUnique({
      where: {
        userId: dto.userId,
      },
    });
    if (existing) {
      throw new ConflictException('Usuário já possui um perfil.');
    }
    return await this.prisma.profile.create({
      data: {
        userId: dto.userId ?? 0,
        fullName: dto.fullName ?? '',
        birthDate: dto.birthDate ? parseDate(dto.birthDate) : undefined,
        avatarUrl: dto.avatarUrl ?? '',
      },
    });
  }

  async update(id: number, dto: UpdateProfileDto, userId: number) {
    const profile = await this.prisma.profile.findUnique({
      where: { id, userId },
    });
    if (!profile) throw new NotFoundException('Perfil não encontrado.');
    return await this.prisma.$transaction(async (tx) => {
      if (dto.fullName !== undefined)
        await updateAccount(tx, userId, { name: dto.fullName });
      return tx.profile.update({
        where: { id, userId },
        data: {
          birthDate:
            dto.birthDate === undefined ? undefined : parseDate(dto.birthDate),
          fullName: dto.fullName,
          avatarUrl: dto.avatarUrl,
        },
      });
    });
  }

  async findOne(id: number, userId: number) {
    const p = await this.prisma.profile.findUnique({ where: { id, userId } });
    if (!p) throw new NotFoundException('Perfil não encontrado.');
    return {
      id: p.id,
      userId: p.userId,
      fullName: p.fullName,
      birthDate: p.birthDate?.toISOString(),
      avatarUrl: p.avatarUrl ?? '',
    };
  }
}
