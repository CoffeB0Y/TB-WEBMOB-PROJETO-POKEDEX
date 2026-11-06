import type { AuthenticatedRequest } from '../auth/authenticated-request';
import {
  Controller,
  Delete,
  Get,
  Param,
  ParseIntPipe,
  Post,
  Req,
  UseGuards,
} from '@nestjs/common';

import { BadgesService } from './badges.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';

@Controller('badges')
export class BadgesController {
  constructor(private readonly badgesService: BadgesService) {}

  // Público: lista as insígnias existentes
  @Get()
  async findAll() {
    return this.badgesService.findAll();
  }

  // Público: consulta uma insígnia
  @Get('progress')
  getProgress(@Req() req: AuthenticatedRequest) {
    return this.badgesService.getProgress(req.user.id);
  }

  @Get(':id')
  async findOne(@Param('id', ParseIntPipe) id: number) {
    return this.badgesService.findOne(Number(id));
  }

  // Protegido: insígnias do treinador logado
  @Get('trainer/me')
  @UseGuards(JwtAuthGuard)
  async findTrainerBadges(@Req() req: AuthenticatedRequest) {
    return this.badgesService.findTrainerBadges(req.user.id);
  }

  // Protegido: conquista uma insígnia
  @Post(':id/claim')
  @UseGuards(JwtAuthGuard)
  claimBadge() {
    return this.badgesService.claimBadge();
  }

  // Protegido: remove uma insígnia
  @Delete(':id')
  @UseGuards(JwtAuthGuard)
  removeBadge() {
    return this.badgesService.removeBadge();
  }
}
