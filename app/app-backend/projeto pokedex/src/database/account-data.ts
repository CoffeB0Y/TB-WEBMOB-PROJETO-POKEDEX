import type { Prisma } from '../../prisma/generated/prisma/client';
import { ConflictException } from '@nestjs/common';

export function rethrowAccountError(error: unknown): never {
  if (
    typeof error === 'object' &&
    error !== null &&
    'code' in error &&
    error.code === 'P2002'
  ) {
    throw new ConflictException('E-mail ou nome de usuário já cadastrado.');
  }
  throw error;
}

// Nome de conta, nome completo e nome de treinador têm uma única estratégia de escrita.
export async function updateAccount(
  tx: Prisma.TransactionClient,
  userId: number,
  input: { name?: string; email?: string },
) {
  const user = await tx.user.update({
    where: { id: userId },
    data: { name: input.name, email: input.email?.trim().toLowerCase() },
    select: { id: true, name: true, email: true },
  });
  if (input.name !== undefined) {
    await tx.profile.upsert({
      where: { userId },
      create: { userId, fullName: input.name, trainerName: input.name },
      update: { fullName: input.name, trainerName: input.name },
    });
  }
  return user;
}
