import { Controller, Get, Post, Put, Delete, Body, Param, UseGuards, Request, Ip } from '@nestjs/common';
import { ReservationsService, CreateReservationDto, UpdateReservationDto } from './reservations.service';
import { JwtAuthGuard } from '../auth/guards';

@Controller('reservations')
@UseGuards(JwtAuthGuard)
export class ReservationsController {
  constructor(private reservationsService: ReservationsService) {}

  @Get('stats')
  stats() { return this.reservationsService.getStats(); }

  @Get()
  findAll() {
    // All authenticated users see ALL reservations
    return this.reservationsService.findAll();
  }

  @Get(':id')
  findOne(@Param('id') id: string, @Request() req: any) {
    return this.reservationsService.findOne(id, req.user.id, req.user.role);
  }

  @Post()
  create(@Body() dto: CreateReservationDto, @Request() req: any, @Ip() ip: string) {
    return this.reservationsService.create(dto, req.user.id, ip);
  }

  @Put(':id')
  update(@Param('id') id: string, @Body() dto: UpdateReservationDto, @Request() req: any, @Ip() ip: string) {
    return this.reservationsService.update(id, dto, req.user.id, req.user.role, ip);
  }

  @Delete(':id')
  remove(@Param('id') id: string, @Request() req: any, @Ip() ip: string) {
    return this.reservationsService.remove(id, req.user.id, req.user.role, ip);
  }
}
