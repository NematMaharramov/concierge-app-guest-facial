import { Controller, Get, Post, Body, Query, UseGuards, Req } from '@nestjs/common';
import { Request } from 'express';
import { GuestCommunicationsService, SendLetterDto } from './guest-communications.service';
import { JwtAuthGuard, TenantGuard } from '../auth/guards';

// Available to ADMIN and CONCIERGE both — sending pre-arrival letters is
// explicitly a concierge task per the spec's role table, while ADMIN
// should be able to do it too (and see the history).
@Controller('guest-communications')
@UseGuards(JwtAuthGuard, TenantGuard)
export class GuestCommunicationsController {
  constructor(private guestCommunicationsService: GuestCommunicationsService) {}

  @Get('send-context')
  getSendContext(@Req() req: Request) {
    return this.guestCommunicationsService.getSendContext(req.user!['tenantId']);
  }

  @Get('suggested-events')
  suggestedEvents(
    @Query('arrivalDate') arrivalDate: string,
    @Query('departureDate') departureDate: string,
    @Req() req: Request,
  ) {
    return this.guestCommunicationsService.suggestedEvents(
      req.user!['tenantId'],
      new Date(arrivalDate),
      new Date(departureDate || arrivalDate),
    );
  }

  @Post('preview')
  preview(@Body() dto: SendLetterDto, @Req() req: Request) {
    return this.guestCommunicationsService.preview(dto, req.user!['tenantId']);
  }

  @Post('send')
  send(@Body() dto: SendLetterDto, @Req() req: Request) {
    return this.guestCommunicationsService.send(dto, req.user as any);
  }

  @Get('history')
  history(@Req() req: Request) {
    return this.guestCommunicationsService.findHistory(req.user!['tenantId']);
  }
}
