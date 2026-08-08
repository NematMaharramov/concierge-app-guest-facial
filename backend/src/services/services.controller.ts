import { Controller, Get, Post, Put, Delete, Body, Param, Query, UseGuards, Req } from '@nestjs/common';
import { Request } from 'express';
import { ServicesService, CreateServiceDto, UpdateServiceDto } from './services.service';
import { JwtAuthGuard, RolesGuard, Roles, TenantGuard } from '../auth/guards';

@Controller('services')
export class ServicesController {
  constructor(private servicesService: ServicesService) {}

  @Get()
  findAll(@Query('categoryId') categoryId: string | undefined, @Query('all') all: string | undefined, @Req() req: Request) {
    return this.servicesService.findAll(categoryId, all === 'true', req.tenant?.id);
  }

  @Get(':id')
  findOne(@Param('id') id: string, @Req() req: Request) {
    return this.servicesService.findOne(id, req.tenant?.id);
  }

  @Post()
  @UseGuards(JwtAuthGuard, RolesGuard, TenantGuard)
  @Roles('ADMIN')
  create(@Body() dto: CreateServiceDto, @Req() req: Request) {
    return this.servicesService.create(dto, req.user?.['tenantId']);
  }

  @Put(':id')
  @UseGuards(JwtAuthGuard, RolesGuard, TenantGuard)
  @Roles('ADMIN')
  update(@Param('id') id: string, @Body() dto: UpdateServiceDto, @Req() req: Request) {
    return this.servicesService.update(id, dto, req.user?.['tenantId']);
  }

  @Delete(':id')
  @UseGuards(JwtAuthGuard, RolesGuard, TenantGuard)
  @Roles('ADMIN')
  remove(@Param('id') id: string, @Req() req: Request) {
    return this.servicesService.remove(id, req.user?.['tenantId']);
  }
}
