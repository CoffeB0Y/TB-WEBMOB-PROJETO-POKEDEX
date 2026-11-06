import { BadRequestException } from '@nestjs/common';

export function parseDate(value: string): Date {
  const date = new Date(
    /^\d{4}-\d{2}-\d{2}$/.test(value) ? `${value}T12:00:00.000Z` : value,
  );
  if (!Number.isFinite(date.getTime()))
    throw new BadRequestException('Data inválida.');
  return date;
}
