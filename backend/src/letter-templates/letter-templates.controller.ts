import { Controller, Get, Post, Put, Delete, Body, Param, UseGuards, Req } from '@nestjs/common';
import { Request } from 'express';
import { LetterTemplatesService, CreateLetterTemplateDto, UpdateLetterTemplateDto } from './letter-templates.service';
import { JwtAuthGuard, RolesGuard, Roles, TenantGuard } from '../auth/guards';
import { SUPPORTED_MERGE_FIELDS } from '../common/merge-engine';

@Controller('letter-templates')
export class LetterTemplatesController {
  constructor(private letterTemplatesService: LetterTemplatesService) {}

  @Get('merge-fields')
  getMergeFields() {
    return SUPPORTED_MERGE_FIELDS;
  }

  // Readable by ADMIN and CONCIERGE (concierge needs the list to pick a
  // template when sending a letter); only ADMIN can create/edit/delete.
  @Get()
  @UseGuards(JwtAuthGuard, TenantGuard)
  findAll(@Req() req: Request) {
    return this.letterTemplatesService.findAll(req.user!['tenantId']);
  }

  @Get(':id')
  @UseGuards(JwtAuthGuard, TenantGuard)
  findOne(@Param('id') id: string, @Req() req: Request) {
    return this.letterTemplatesService.findOne(id, req.user?.['tenantId']);
  }

  @Post()
  @UseGuards(JwtAuthGuard, RolesGuard, TenantGuard)
  @Roles('ADMIN')
  create(@Body() dto: CreateLetterTemplateDto, @Req() req: Request) {
    return this.letterTemplatesService.create(dto, req.user!['tenantId']);
  }

  @Put(':id')
  @UseGuards(JwtAuthGuard, RolesGuard, TenantGuard)
  @Roles('ADMIN')
  update(@Param('id') id: string, @Body() dto: UpdateLetterTemplateDto, @Req() req: Request) {
    return this.letterTemplatesService.update(id, dto, req.user?.['tenantId']);
  }

  @Delete(':id')
  @UseGuards(JwtAuthGuard, RolesGuard, TenantGuard)
  @Roles('ADMIN')
  remove(@Param('id') id: string, @Req() req: Request) {
    return this.letterTemplatesService.remove(id, req.user?.['tenantId']);
  }
}
