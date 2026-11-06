import type { AuthenticatedRequest } from '../auth/authenticated-request';
import { Controller, Get, Req, UseGuards } from '@nestjs/common';

import { ProgressionService } from './progression.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';

@Controller('progression')
@UseGuards(JwtAuthGuard)
export class ProgressionController {
  constructor(private readonly progressionService: ProgressionService) {}

  @Get('me')
  async getMyProgress(@Req() req: AuthenticatedRequest) {
    return this.progressionService.getTrainerProgress(req.user.id);
  }
}
