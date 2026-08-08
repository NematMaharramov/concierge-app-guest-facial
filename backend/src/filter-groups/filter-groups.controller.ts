import { Controller, Get, Post, Put, Delete, Body, Param, UseGuards, Req } from '@nestjs/common';
import { Request } from 'express';
import {
  FilterGroupsService,
  CreateFilterGroupDto,
  UpdateFilterGroupDto,
  AddFilterOptionDto,
  UpdateFilterOptionDto,
} from './filter-groups.service';
import { JwtAuthGuard, RolesGuard, Roles, TenantGuard } from '../auth/guards';

@Controller()
export class FilterGroupsController {
  constructor(private filterGroupsService: FilterGroupsService) {}

  // Public — the guest category page needs this to know whether to render
  // a chip filter bar. Admin category-edit screen reuses the same call.
  @Get('categories/:categoryId/filter-groups')
  findByCategory(@Param('categoryId') categoryId: string) {
    return this.filterGroupsService.findByCategory(categoryId);
  }

  @Post('categories/:categoryId/filter-groups')
  @UseGuards(JwtAuthGuard, RolesGuard, TenantGuard)
  @Roles('ADMIN')
  create(@Param('categoryId') categoryId: string, @Body() dto: CreateFilterGroupDto, @Req() req: Request) {
    return this.filterGroupsService.create(categoryId, dto, req.user?.['tenantId']);
  }

  @Put('filter-groups/:id')
  @UseGuards(JwtAuthGuard, RolesGuard, TenantGuard)
  @Roles('ADMIN')
  update(@Param('id') id: string, @Body() dto: UpdateFilterGroupDto, @Req() req: Request) {
    return this.filterGroupsService.update(id, dto, req.user?.['tenantId']);
  }

  @Delete('filter-groups/:id')
  @UseGuards(JwtAuthGuard, RolesGuard, TenantGuard)
  @Roles('ADMIN')
  remove(@Param('id') id: string, @Req() req: Request) {
    return this.filterGroupsService.remove(id, req.user?.['tenantId']);
  }

  @Post('filter-groups/:id/options')
  @UseGuards(JwtAuthGuard, RolesGuard, TenantGuard)
  @Roles('ADMIN')
  addOption(@Param('id') id: string, @Body() dto: AddFilterOptionDto, @Req() req: Request) {
    return this.filterGroupsService.addOption(id, dto, req.user?.['tenantId']);
  }

  @Put('filter-options/:id')
  @UseGuards(JwtAuthGuard, RolesGuard, TenantGuard)
  @Roles('ADMIN')
  updateOption(@Param('id') id: string, @Body() dto: UpdateFilterOptionDto, @Req() req: Request) {
    return this.filterGroupsService.updateOption(id, dto, req.user?.['tenantId']);
  }

  @Delete('filter-options/:id')
  @UseGuards(JwtAuthGuard, RolesGuard, TenantGuard)
  @Roles('ADMIN')
  removeOption(@Param('id') id: string, @Req() req: Request) {
    return this.filterGroupsService.removeOption(id, req.user?.['tenantId']);
  }
}
