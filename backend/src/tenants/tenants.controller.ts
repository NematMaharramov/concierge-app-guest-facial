import { Controller, Get, Post, Put, Body, Param, Req, UseGuards } from '@nestjs/common';
import { Request } from 'express';
import { TenantsService, CreateTenantDto, UpdateTenantDto, UpsertTenantBrandingDto, SetFeatureFlagDto } from './tenants.service';
import { JwtAuthGuard, RolesGuard, Roles } from '../auth/guards';

@Controller('tenants')
export class TenantsController {
  constructor(private tenantsService: TenantsService) {}

  // Lets the frontend discover which tenant the current host/header
  // resolves to (branding, name) without requiring auth — needed for the
  // public guest site to theme itself before login, and (Part 4) to check
  // feature flags like 'monthly_events' to decide whether to render an
  // optional guest-site section at all.
  @Get('current')
  async current(@Req() req: Request) {
    if (!req.tenant) return null;
    const flags = await this.tenantsService.getFeatureFlags(req.tenant.id);
    return {
      ...req.tenant,
      featureFlags: Object.fromEntries(flags.map((f) => [f.key, f.enabled])),
    };
  }

  @Get()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('SUPER_ADMIN')
  findAll() {
    return this.tenantsService.findAll();
  }

  @Get(':id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('SUPER_ADMIN')
  findOne(@Param('id') id: string) {
    return this.tenantsService.findById(id);
  }

  @Post()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('SUPER_ADMIN')
  create(@Body() dto: CreateTenantDto) {
    return this.tenantsService.create(dto);
  }

  @Put(':id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('SUPER_ADMIN')
  update(@Param('id') id: string, @Body() dto: UpdateTenantDto) {
    return this.tenantsService.update(id, dto);
  }

  @Get(':id/branding')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('SUPER_ADMIN')
  getBranding(@Param('id') id: string) {
    return this.tenantsService.getBranding(id);
  }

  @Put(':id/branding')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('SUPER_ADMIN')
  upsertBranding(@Param('id') id: string, @Body() dto: UpsertTenantBrandingDto) {
    return this.tenantsService.upsertBranding(id, dto);
  }

  @Get(':id/feature-flags')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('SUPER_ADMIN')
  getFeatureFlags(@Param('id') id: string) {
    return this.tenantsService.getFeatureFlags(id);
  }

  @Put(':id/feature-flags')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('SUPER_ADMIN')
  setFeatureFlag(@Param('id') id: string, @Body() dto: SetFeatureFlagDto) {
    return this.tenantsService.setFeatureFlag(id, dto);
  }
}
