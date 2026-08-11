import { Controller, Get, Post, Put, Delete, Body, Param, UseGuards, Req } from '@nestjs/common';
import { Request } from 'express';
import { RoomTypesService, CreateRoomTypeDto, UpdateRoomTypeDto } from './room-types.service';
import { JwtAuthGuard, RolesGuard, Roles, TenantGuard } from '../auth/guards';

@Controller('room-types')
export class RoomTypesController {
  constructor(private roomTypesService: RoomTypesService) {}

  @Get()
  @UseGuards(JwtAuthGuard, TenantGuard)
  findAll(@Req() req: Request) {
    return this.roomTypesService.findAll(req.user!['tenantId']);
  }

  @Post()
  @UseGuards(JwtAuthGuard, RolesGuard, TenantGuard)
  @Roles('ADMIN')
  create(@Body() dto: CreateRoomTypeDto, @Req() req: Request) {
    return this.roomTypesService.create(dto, req.user!['tenantId']);
  }

  @Put(':id')
  @UseGuards(JwtAuthGuard, RolesGuard, TenantGuard)
  @Roles('ADMIN')
  update(@Param('id') id: string, @Body() dto: UpdateRoomTypeDto, @Req() req: Request) {
    return this.roomTypesService.update(id, dto, req.user?.['tenantId']);
  }

  @Delete(':id')
  @UseGuards(JwtAuthGuard, RolesGuard, TenantGuard)
  @Roles('ADMIN')
  remove(@Param('id') id: string, @Req() req: Request) {
    return this.roomTypesService.remove(id, req.user?.['tenantId']);
  }
}
