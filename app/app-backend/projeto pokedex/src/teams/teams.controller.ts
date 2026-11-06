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

import { TeamDto, TeamMemberDto } from '../dtos/team-dto';
import type { AuthenticatedRequest } from '../auth/authenticated-request';
import { TeamsService } from './teams.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';

@Controller('teams')
@UseGuards(JwtAuthGuard)
export class TeamsController {
  constructor(private readonly teamsService: TeamsService) {}

  @Post()
  async create(@Req() req: AuthenticatedRequest, @Body() body: TeamDto) {
    return this.teamsService.create(req.user.id, body);
  }

  @Get()
  async findAll(@Req() req: AuthenticatedRequest) {
    return this.teamsService.findAll(req.user.id);
  }

  @Get(':id')
  async findOne(
    @Req() req: AuthenticatedRequest,
    @Param('id', ParseIntPipe) id: number,
  ) {
    return this.teamsService.findOne(req.user.id, Number(id));
  }

  @Post(':id/pokemon')
  async addPokemon(
    @Req() req: AuthenticatedRequest,
    @Param('id', ParseIntPipe) id: number,
    @Body()
    body: TeamMemberDto,
  ) {
    return this.teamsService.addPokemon(
      req.user.id,
      Number(id),
      body.capturedPokemonId,
      body.position,
    );
  }

  @Delete(':id/pokemon/:pokemonId')
  async removePokemon(
    @Req() req: AuthenticatedRequest,
    @Param('id', ParseIntPipe) id: number,
    @Param('pokemonId', ParseIntPipe) pokemonId: number,
  ) {
    return this.teamsService.removePokemon(
      req.user.id,
      Number(id),
      Number(pokemonId),
    );
  }

  @Patch(':id')
  async update(
    @Req() req: AuthenticatedRequest,
    @Param('id', ParseIntPipe) id: number,
    @Body() body: TeamDto,
  ) {
    return this.teamsService.updateTeam(req.user.id, Number(id), body);
  }

  @Delete(':id')
  async remove(
    @Req() req: AuthenticatedRequest,
    @Param('id', ParseIntPipe) id: number,
  ) {
    return this.teamsService.removeTeam(req.user.id, Number(id));
  }
}
