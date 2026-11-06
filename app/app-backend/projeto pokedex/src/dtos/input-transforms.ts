import { Transform } from 'class-transformer';
import { ValidateIf } from 'class-validator';

// Ausência é opcional; null continua sendo validado e rejeitado.
export const OptionalInput = () =>
  ValidateIf((_object: unknown, value: unknown) => value !== undefined);
export const Trim = () =>
  Transform(({ value }: { value: unknown }) =>
    typeof value === 'string' ? value.trim() : value,
  );
