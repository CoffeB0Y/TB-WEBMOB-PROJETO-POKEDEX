import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseIntPipe,
  Patch,
  Post,
  Req,
  UseGuards,
} from '@nestjs/common';

import {
  CreateCapturedPokemonDto,
  UpdateCapturedPokemonDto,
} from '../dtos/captured-pokemon-dto';
import type { AuthenticatedRequest } from '../auth/authenticated-request';
import { CapturedPokemonService } from './captured-pokemon.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';

@Controller('captured-pokemon')
@UseGuards(JwtAuthGuard)
export class CapturedPokemonController {
  constructor(
    private readonly capturedPokemonService: CapturedPokemonService,
  ) {}

  @Post()
  async create(
    @Req() req: AuthenticatedRequest,
    @Body()
    body: CreateCapturedPokemonDto,
  ) {
    return this.capturedPokemonService.create(
      req.user.id,
      body.pokemonId,
      body.nickname,
      body.level ?? 1,
      body.captureLocation,
      body.captureDate,
      body.notes,
    );
  }

  @Get()
  async findAll(@Req() req: AuthenticatedRequest) {
    return this.capturedPokemonService.findAllByUser(req.user.id);
  }

  @Get(':id')
  async findOne(
    @Req() req: AuthenticatedRequest,
    @Param('id', ParseIntPipe) id: number,
  ) {
    return this.capturedPokemonService.findOne(Number(id), req.user.id);
  }

  @Patch(':id')
  async update(
    @Req() req: AuthenticatedRequest,
    @Param('id', ParseIntPipe) id: number,
    @Body() body: UpdateCapturedPokemonDto,
  ) {
    return this.capturedPokemonService.update(Number(id), req.user.id, body);
  }

  @Delete(':id')
  async remove(
    @Req() req: AuthenticatedRequest,
    @Param('id', ParseIntPipe) id: number,
  ) {
    return this.capturedPokemonService.remove(Number(id), req.user.id);
  }
}
