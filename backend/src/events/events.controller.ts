import { Controller, Get, Post, Put, Delete, Body, Param, Query, UseGuards, Req } from '@nestjs/common';
import { Request } from 'express';
import { EventsService, CreateEventDto, UpdateEventDto } from './events.service';
import { JwtAuthGuard, RolesGuard, Roles, TenantGuard } from '../auth/guards';

@Controller('events')
export class EventsController {
  constructor(private eventsService: EventsService) {}

  // Public — the guest site's optional "What's happening this month?"
  // section. Scoped by the host-resolved tenant, same pattern as
  // categories/services. Returns [] (not an error) if no tenant resolves
  // or it has no events, so the guest site can just check .length.
  @Get()
  findAll(@Query('upcoming') upcoming: string | undefined, @Req() req: Request) {
    if (!req.tenant?.id) return [];
    return upcoming === 'true'
      ? this.eventsService.findUpcoming(req.tenant.id)
      : this.eventsService.findAll(req.tenant.id);
  }

  // Admin — includes inactive events, scoped to the admin's own tenant.
  @Get('admin')
  @UseGuards(JwtAuthGuard, RolesGuard, TenantGuard)
  @Roles('ADMIN')
  findAllForAdmin(@Req() req: Request) {
    return this.eventsService.findAll(req.user!['tenantId'], true);
  }

  @Get(':id')
  findOne(@Param('id') id: string, @Req() req: Request) {
    return this.eventsService.findOne(id, req.tenant?.id);
  }

  @Post()
  @UseGuards(JwtAuthGuard, RolesGuard, TenantGuard)
  @Roles('ADMIN')
  create(@Body() dto: CreateEventDto, @Req() req: Request) {
    return this.eventsService.create(dto, req.user!['tenantId']);
  }

  @Put(':id')
  @UseGuards(JwtAuthGuard, RolesGuard, TenantGuard)
  @Roles('ADMIN')
  update(@Param('id') id: string, @Body() dto: UpdateEventDto, @Req() req: Request) {
    return this.eventsService.update(id, dto, req.user?.['tenantId']);
  }

  @Delete(':id')
  @UseGuards(JwtAuthGuard, RolesGuard, TenantGuard)
  @Roles('ADMIN')
  remove(@Param('id') id: string, @Req() req: Request) {
    return this.eventsService.remove(id, req.user?.['tenantId']);
  }
}
