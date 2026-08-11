import { Controller, Get, Put, Body, Param, UseGuards } from '@nestjs/common';
import { IntegrationsService, UpsertOutlookConfigDto } from './integrations.service';
import { JwtAuthGuard, RolesGuard, Roles } from '../auth/guards';

// Per the spec's role table, integration configuration is a SUPER_ADMIN
// responsibility, not a tenant ADMIN one — credentials touch a shared
// platform-level Azure App Registration, not something a brand's own
// admin should be handling.
@Controller('integrations')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('SUPER_ADMIN')
export class IntegrationsController {
  constructor(private integrationsService: IntegrationsService) {}

  @Get(':tenantId/outlook')
  getOutlookStatus(@Param('tenantId') tenantId: string) {
    return this.integrationsService.getStatus(tenantId, 'outlook');
  }

  @Put(':tenantId/outlook')
  upsertOutlookConfig(@Param('tenantId') tenantId: string, @Body() dto: UpsertOutlookConfigDto) {
    return this.integrationsService.upsertOutlookConfig(tenantId, dto);
  }
}
