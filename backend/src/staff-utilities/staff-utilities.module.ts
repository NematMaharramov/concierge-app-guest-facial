import { Module } from '@nestjs/common';
import { TaxiDriversService } from './taxi-drivers.service';
import { PhoneDirectoryService } from './phone-directory.service';
import { PriceSheetsService } from './price-sheets.service';
import { StaffUtilitiesController } from './staff-utilities.controller';

@Module({
  providers: [TaxiDriversService, PhoneDirectoryService, PriceSheetsService],
  controllers: [StaffUtilitiesController],
})
export class StaffUtilitiesModule {}
