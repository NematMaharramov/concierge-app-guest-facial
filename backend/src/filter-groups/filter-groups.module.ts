import { Module } from '@nestjs/common';
import { FilterGroupsService } from './filter-groups.service';
import { FilterGroupsController } from './filter-groups.controller';

@Module({
  providers: [FilterGroupsService],
  controllers: [FilterGroupsController],
  exports: [FilterGroupsService],
})
export class FilterGroupsModule {}
