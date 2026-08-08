import { Controller, Get, Query, UseGuards, Request } from '@nestjs/common';
import { AuditService } from './audit.service';
import { JwtAuthGuard } from '../auth/guards';

@Controller('audit')
@UseGuards(JwtAuthGuard)
export class AuditController {
  constructor(private auditService: AuditService) {}

  @Get()
  findAll(@Query('reservationId') reservationId: string | undefined, @Request() req: any) {
    return this.auditService.findAll(reservationId, req.user?.tenantId);
  }
}
