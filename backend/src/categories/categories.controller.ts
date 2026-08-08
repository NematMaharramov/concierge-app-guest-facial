import { Controller, Get, Post, Put, Delete, Body, Param, Query, UseGuards, Req } from '@nestjs/common';
import { Request } from 'express';
import { CategoriesService, CreateCategoryDto, UpdateCategoryDto } from './categories.service';
import { JwtAuthGuard, RolesGuard, Roles, TenantGuard } from '../auth/guards';

@Controller('categories')
export class CategoriesController {
  constructor(private categoriesService: CategoriesService) {}

  // Public/guest routes are scoped by the host-resolved tenant (req.tenant,
  // set by TenantContextMiddleware). Admin write routes are scoped by the
  // authenticated user's own tenantId so an admin can never write into a
  // tenant other than their own.

  @Get()
  findAll(@Query('all') all: string | undefined, @Req() req: Request) {
    return this.categoriesService.findAll(all === 'true', req.tenant?.id);
  }

  @Get(':slug/by-slug')
  findBySlug(@Param('slug') slug: string, @Req() req: Request) {
    return this.categoriesService.findBySlug(slug, req.tenant?.id);
  }

  @Get(':id')
  findOne(@Param('id') id: string, @Req() req: Request) {
    return this.categoriesService.findOne(id, req.tenant?.id);
  }

  @Post()
  @UseGuards(JwtAuthGuard, RolesGuard, TenantGuard)
  @Roles('ADMIN')
  create(@Body() dto: CreateCategoryDto, @Req() req: Request) {
    return this.categoriesService.create(dto, req.user?.['tenantId']);
  }

  @Put(':id')
  @UseGuards(JwtAuthGuard, RolesGuard, TenantGuard)
  @Roles('ADMIN')
  update(@Param('id') id: string, @Body() dto: UpdateCategoryDto, @Req() req: Request) {
    return this.categoriesService.update(id, dto, req.user?.['tenantId']);
  }

  @Delete(':id')
  @UseGuards(JwtAuthGuard, RolesGuard, TenantGuard)
  @Roles('ADMIN')
  remove(@Param('id') id: string, @Req() req: Request) {
    return this.categoriesService.remove(id, req.user?.['tenantId']);
  }
}
