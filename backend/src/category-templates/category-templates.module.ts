import { Module } from '@nestjs/common';
import { CategoryTemplatesService } from './category-templates.service';
import { CategoryTemplatesController } from './category-templates.controller';

@Module({
  providers: [CategoryTemplatesService],
  controllers: [CategoryTemplatesController],
  exports: [CategoryTemplatesService],
})
export class CategoryTemplatesModule {}
