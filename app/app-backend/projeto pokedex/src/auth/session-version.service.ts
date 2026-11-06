import { Injectable } from '@nestjs/common';
import { PrismaService } from '../database/prisma.service';

@Injectable()
export class SessionVersionService {
  constructor(private readonly prisma: PrismaService) {}

  async getVersion(userId: number): Promise<number | null> {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { sessionVersion: true },
    });
    return user?.sessionVersion ?? null;
  }
}
