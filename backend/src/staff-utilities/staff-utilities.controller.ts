import { Controller, Get, Post, Put, Delete, Body, Param, UseGuards, Req } from '@nestjs/common';
import { Request } from 'express';
import { TaxiDriversService, CreateTaxiDriverDto, UpdateTaxiDriverDto } from './taxi-drivers.service';
import { PhoneDirectoryService, CreatePhoneEntryDto, UpdatePhoneEntryDto } from './phone-directory.service';
import { PriceSheetsService, CreatePriceSheetItemDto, UpdatePriceSheetItemDto } from './price-sheets.service';
import { JwtAuthGuard, RolesGuard, Roles, TenantGuard } from '../auth/guards';

// Three small, similar resources sharing one controller/module rather than
// three near-identical ones — each is CRUD over a flat tenant-scoped list.
// Read is CONCIERGE+ADMIN (staff reference material); write is ADMIN only,
// consistent with the rest of the app's content-management convention.
@Controller()
@UseGuards(JwtAuthGuard, TenantGuard)
export class StaffUtilitiesController {
  constructor(
    private taxiDrivers: TaxiDriversService,
    private phoneDirectory: PhoneDirectoryService,
    private priceSheets: PriceSheetsService,
  ) {}

  // ── Taxi Drivers ──────────────────────────────────────────────
  @Get('taxi-drivers')
  findAllTaxiDrivers(@Req() req: Request) { return this.taxiDrivers.findAll(req.user!['tenantId']); }

  @Post('taxi-drivers')
  @UseGuards(RolesGuard) @Roles('ADMIN')
  createTaxiDriver(@Body() dto: CreateTaxiDriverDto, @Req() req: Request) { return this.taxiDrivers.create(dto, req.user!['tenantId']); }

  @Put('taxi-drivers/:id')
  @UseGuards(RolesGuard) @Roles('ADMIN')
  updateTaxiDriver(@Param('id') id: string, @Body() dto: UpdateTaxiDriverDto, @Req() req: Request) { return this.taxiDrivers.update(id, dto, req.user?.['tenantId']); }

  @Delete('taxi-drivers/:id')
  @UseGuards(RolesGuard) @Roles('ADMIN')
  removeTaxiDriver(@Param('id') id: string, @Req() req: Request) { return this.taxiDrivers.remove(id, req.user?.['tenantId']); }

  // ── Phone Directory ───────────────────────────────────────────
  @Get('phone-directory')
  findAllPhoneEntries(@Req() req: Request) { return this.phoneDirectory.findAll(req.user!['tenantId']); }

  @Post('phone-directory')
  @UseGuards(RolesGuard) @Roles('ADMIN')
  createPhoneEntry(@Body() dto: CreatePhoneEntryDto, @Req() req: Request) { return this.phoneDirectory.create(dto, req.user!['tenantId']); }

  @Put('phone-directory/:id')
  @UseGuards(RolesGuard) @Roles('ADMIN')
  updatePhoneEntry(@Param('id') id: string, @Body() dto: UpdatePhoneEntryDto, @Req() req: Request) { return this.phoneDirectory.update(id, dto, req.user?.['tenantId']); }

  @Delete('phone-directory/:id')
  @UseGuards(RolesGuard) @Roles('ADMIN')
  removePhoneEntry(@Param('id') id: string, @Req() req: Request) { return this.phoneDirectory.remove(id, req.user?.['tenantId']); }

  // ── Price Sheets ──────────────────────────────────────────────
  @Get('price-sheets')
  findAllPriceSheetItems(@Req() req: Request) { return this.priceSheets.findAll(req.user!['tenantId']); }

  @Post('price-sheets')
  @UseGuards(RolesGuard) @Roles('ADMIN')
  createPriceSheetItem(@Body() dto: CreatePriceSheetItemDto, @Req() req: Request) { return this.priceSheets.create(dto, req.user!['tenantId']); }

  @Put('price-sheets/:id')
  @UseGuards(RolesGuard) @Roles('ADMIN')
  updatePriceSheetItem(@Param('id') id: string, @Body() dto: UpdatePriceSheetItemDto, @Req() req: Request) { return this.priceSheets.update(id, dto, req.user?.['tenantId']); }

  @Delete('price-sheets/:id')
  @UseGuards(RolesGuard) @Roles('ADMIN')
  removePriceSheetItem(@Param('id') id: string, @Req() req: Request) { return this.priceSheets.remove(id, req.user?.['tenantId']); }
}
