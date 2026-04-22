import { Controller, Get, Post, Put, Delete, Body, Param, UseGuards } from '@nestjs/common';
import { UsersService, CreateUserDto, UpdateUserDto } from './users.service';
import { JwtAuthGuard, RolesGuard, Roles } from '../auth/guards';

@Controller('users')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('ADMIN')
export class UsersController {
  constructor(private usersService: UsersService) {}

  @Get() findAll() { return this.usersService.findAll(); }
  @Get(':id') findOne(@Param('id') id: string) { return this.usersService.findOne(id); }
  @Post() create(@Body() dto: CreateUserDto) { return this.usersService.create(dto); }
  @Put(':id') update(@Param('id') id: string, @Body() dto: UpdateUserDto) { return this.usersService.update(id, dto); }
  @Delete(':id') remove(@Param('id') id: string) { return this.usersService.remove(id); }
}
