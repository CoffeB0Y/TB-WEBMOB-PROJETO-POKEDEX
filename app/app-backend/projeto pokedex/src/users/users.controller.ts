import {
  Body,
  Controller,
  Delete,
  ForbiddenException,
  Get,
  Param,
  ParseIntPipe,
  Post,
  Put,
  Req,
} from '@nestjs/common';
import { CreateUserDTO } from '../dtos/create-users-dto';
import { UpdateUserDto } from '../dtos/update-user-dto';
import { UsersService } from './users.service';
import type { AuthenticatedRequest } from '../auth/authenticated-request';
@Controller('users')
export class UsersController {
  constructor(private readonly service: UsersService) {}
  @Post() async create(
    @Req() req: AuthenticatedRequest,
    @Body() body: CreateUserDTO,
  ) {
    const user = await this.service.createUser(body, req.user.id);
    return { id: user.id, name: user.name, email: user.email };
  }
  @Get() findAll(@Req() req: AuthenticatedRequest) {
    return this.service.getAllUsers(req.user.id);
  }
  @Put(':id') update(
    @Req() req: AuthenticatedRequest,
    @Param('id', ParseIntPipe) id: number,
    @Body() body: UpdateUserDto,
  ) {
    this.assertOwner(req.user.id, id);
    return this.service.updateUser(id, body);
  }
  @Delete(':id') remove(
    @Req() req: AuthenticatedRequest,
    @Param('id', ParseIntPipe) id: number,
  ) {
    this.assertOwner(req.user.id, id);
    return this.service.deleteUser(id);
  }
  private assertOwner(userId: number, id: number) {
    if (userId !== id)
      throw new ForbiddenException('Acesso restrito à própria conta.');
  }
}
