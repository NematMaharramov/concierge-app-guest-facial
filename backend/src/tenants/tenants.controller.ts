import { Controller, Get, Param, Req, UseGuards } from '@nestjs/common';
import { Request } from 'express';
import { TenantsService } from './tenants.service';
import { JwtAuthGuard, RolesGuard, Roles } from '../auth/guards';

@Controller('tenants')
export class TenantsController {
  constructor(private tenantsService: TenantsService) {}

  // Lets the frontend discover which tenant the current host/header
  // resolves to (branding, name) without requiring auth — needed for the
  // public guest site to theme itself before login.
  @Get('current')
  current(@Req() req: Request) {
    return req.tenant || null;
  }

  @Get()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ADMIN')
  findAll() {
    return this.tenantsService.findAll();
  }

  @Get(':id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ADMIN')
  findOne(@Param('id') id: string) {
    return this.tenantsService.findById(id);
  }
}
