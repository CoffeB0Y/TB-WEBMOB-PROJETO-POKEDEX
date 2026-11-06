import { Public } from '../auth/public.decorator';
import { Controller, Get } from '@nestjs/common';

import { LeaderboardService } from './leaderboard.service';

@Controller('leaderboard')
export class LeaderboardController {
  constructor(private readonly leaderboardService: LeaderboardService) {}

  @Public()
  @Get()
  async getLeaderboard() {
    return this.leaderboardService.getLeaderboard();
  }
}
