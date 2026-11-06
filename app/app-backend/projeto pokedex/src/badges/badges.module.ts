import { Module } from '@nestjs/common';

import { BadgesController } from './badges.controller';
import { BadgesService } from './badges.service';
import { DatabaseModule } from '../database/database.module';
import { ProgressionModule } from '../progression/progression.module';

@Module({
  imports: [DatabaseModule, ProgressionModule],
  controllers: [BadgesController],
  exports: [BadgesService],
  providers: [BadgesService],
})
export class BadgesModule {}
