import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';
import { TeamDto } from './team-dto';
import { UpdateCapturedPokemonDto } from './captured-pokemon-dto';
import { RegisterDto } from './register-dto';
import { parseDate } from './parse-date';

describe('Regressão das validações de CRUD', () => {
  it('rejeita booleano null, strings e números; mantém booleanos e ausência válidos', async () => {
    for (const isActive of [null, 'true', 1])
      expect(
        (await validate(plainToInstance(TeamDto, { name: 'Equipe', isActive })))
          .length,
      ).toBeGreaterThan(0);
    for (const isActive of [undefined, true, false])
      expect(
        await validate(plainToInstance(TeamDto, { name: 'Equipe', isActive })),
      ).toHaveLength(0);
  });
  it('rejeita nomes vazios após trim e preserva nomes válidos', async () => {
    expect(
      (await validate(plainToInstance(TeamDto, { name: '   ' }))).length,
    ).toBeGreaterThan(0);
    expect(
      (
        await validate(
          plainToInstance(RegisterDto, {
            name: '   ',
            email: 'x@example.test',
            password: 'senha123',
          }),
        )
      ).length,
    ).toBeGreaterThan(0);
    expect(plainToInstance(TeamDto, { name: '  Kanto  ' }).name).toBe('Kanto');
  });
  it('valida calendário real e rejeita null em datas e nível', async () => {
    for (const captureDate of [null, '2026-02-30', 'inválida'])
      expect(
        (
          await validate(
            plainToInstance(UpdateCapturedPokemonDto, { captureDate }),
          )
        ).length,
      ).toBeGreaterThan(0);
    expect(
      await validate(
        plainToInstance(UpdateCapturedPokemonDto, {
          captureDate: '2024-02-29',
        }),
      ),
    ).toHaveLength(0);
    expect(
      (
        await validate(
          plainToInstance(UpdateCapturedPokemonDto, { level: null }),
        )
      ).length,
    ).toBeGreaterThan(0);
    expect(parseDate('2026-11-05').toISOString()).toBe(
      '2026-11-05T12:00:00.000Z',
    );
    expect(parseDate('2026-11-05T18:00:00Z').toISOString()).toBe(
      '2026-11-05T18:00:00.000Z',
    );
  });
  it('mantém limite de seis e impede integrantes duplicados', async () => {
    for (const ids of [
      [1, 2, 3, 4, 5, 6, 7],
      [1, 1],
    ])
      expect(
        (
          await validate(
            plainToInstance(TeamDto, {
              name: 'Equipe',
              capturedPokemonIds: ids,
            }),
          )
        ).length,
      ).toBeGreaterThan(0);
    expect(
      await validate(
        plainToInstance(TeamDto, {
          name: 'Equipe',
          capturedPokemonIds: [1, 2, 3, 4, 5, 6],
        }),
      ),
    ).toHaveLength(0);
  });
});
