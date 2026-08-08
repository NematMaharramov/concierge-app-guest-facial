import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { CategoryTemplatesService } from './category-templates.service';
import { JwtAuthGuard, RolesGuard, Roles } from '../auth/guards';
import { BusinessVertical } from '@prisma/client';

@Controller('category-templates')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('SUPER_ADMIN')
export class CategoryTemplatesController {
  constructor(private categoryTemplatesService: CategoryTemplatesService) {}

  @Get()
  findAll(@Query('vertical') vertical?: BusinessVertical) {
    return vertical ? this.categoryTemplatesService.findByVertical(vertical) : this.categoryTemplatesService.findAll();
  }
}
