import { ProfileMeDto } from '../dtos/profile-me-dto';
import {
  Controller,
  Req,
  Post,
  Get,
  Put,
  Param,
  Body,
  ParseIntPipe,
} from '@nestjs/common';
import { CreateProfileDto } from '../dtos/create-profile-dto';
import { UpdateProfileDto } from '../dtos/update-profile-dto';
import { ProfilesService } from './profiles.service';
import type { AuthenticatedRequest } from '../auth/authenticated-request';
@Controller('profiles')
export class ProfilesController {
  constructor(private profilesService: ProfilesService) {}
  @Get('me')
  getMe(@Req() req: AuthenticatedRequest) {
    return this.profilesService.getMe(req.user.id);
  }
  @Put('me')
  updateMe(@Req() req: AuthenticatedRequest, @Body() dto: ProfileMeDto) {
    return this.profilesService.updateMe(req.user.id, dto);
  }
  @Post()
  async create(
    @Req() req: AuthenticatedRequest,
    @Body() dto: CreateProfileDto,
  ) {
    return await this.profilesService.create({ ...dto, userId: req.user.id });
  }
  @Get(':id')
  async findOne(
    @Req() req: AuthenticatedRequest,
    @Param('id', ParseIntPipe) id: number,
  ) {
    return await this.profilesService.findOne(id, req.user.id);
  }
  @Put(':id')
  async update(
    @Req() req: AuthenticatedRequest,
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateProfileDto,
  ) {
    return this.profilesService.update(id, dto, req.user.id);
  }
}
