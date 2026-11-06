import { ConflictException, Injectable } from '@nestjs/common';
import { PrismaService } from '../database/prisma.service';
import { CreateUserDTO } from '../dtos/create-users-dto';
import bcrypt from 'bcryptjs';
import { assertPasswordBytes } from '../auth/password-policy';
import { rethrowAccountError, updateAccount } from '../database/account-data';
import { UpdateUserDto } from '../dtos/update-user-dto';
import { GetUserDTO } from '../dtos/get-user-dto';

@Injectable()
export class UsersService {
  constructor(private prisma: PrismaService) {}

  async createUser(dto: CreateUserDTO, createdById?: number) {
    assertPasswordBytes(dto.passwordHash);
    if (await this.findByEmail(dto.email.trim().toLowerCase()))
      throw new ConflictException('E-mail já cadastrado.');
    const passwordHash = await bcrypt.hash(dto.passwordHash, 10);
    try {
      return await this.prisma.user.create({
        data: {
          name: dto.name,
          email: dto.email.trim().toLowerCase(),
          passwordHash: passwordHash,
          createdById,
          profile: { create: { fullName: dto.name, trainerName: dto.name } },
        },
      });
    } catch (error) {
      rethrowAccountError(error);
    }
  }

  async getAllUsers(userId: number): Promise<GetUserDTO[]> {
    return this.prisma.user.findMany({
      where: { OR: [{ id: userId }, { createdById: userId }] },
      select: { id: true, name: true, email: true, createdAt: true },
      orderBy: { name: 'asc' },
    });
  }

  async updateUser(id: number, dto: UpdateUserDto): Promise<void> {
    try {
      await this.prisma.$transaction((tx) => updateAccount(tx, id, dto));
    } catch (error) {
      rethrowAccountError(error);
    }
  }
  async deleteUser(id: number): Promise<void> {
    await this.prisma.user.delete({
      where: { id },
    });
  }

  async findByEmail(email: string) {
    return this.prisma.user.findUnique({
      where: { email: email.trim().toLowerCase() },
    });
  }
}
