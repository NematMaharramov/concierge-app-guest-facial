import {
  Controller,
  Get,
  Post,
  Body,
  Query,
  UploadedFile,
  UseInterceptors,
  UseGuards,
  BadRequestException,
  Request,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { memoryStorage } from 'multer';
import { ImportService, IMPORTABLE_FIELDS } from './import.service';
import { JwtAuthGuard, RolesGuard, Roles } from '../auth/guards';

const fileFilter = (_req: any, file: Express.Multer.File, cb: any) => {
  const ok = /\.(xlsx|xls|csv)$/i.test(file.originalname);
  if (!ok) cb(new BadRequestException('Please upload a .xlsx, .xls, or .csv file'), false);
  else cb(null, true);
};

const uploadOptions = {
  storage: memoryStorage(),
  fileFilter,
  limits: { fileSize: 10 * 1024 * 1024 },
};

// Available to both the Super Admin panel (onboarding a new tenant) and a
// tenant's own Admin panel (ongoing price-sheet updates) — per the spec.
// Both roles land here; scoping to "your own tenant" happens per-request
// via ImportService.assertCanImportInto, not at the route level, since
// SUPER_ADMIN legitimately needs to import into any tenant.
@Controller('import')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('ADMIN', 'SUPER_ADMIN')
export class ImportController {
  constructor(private importService: ImportService) {}

  @Get('fields')
  getImportableFields() {
    return IMPORTABLE_FIELDS;
  }

  // Target categories to import into. ADMIN always imports into their own
  // tenant; SUPER_ADMIN must specify which tenant via ?tenantId=.
  @Get('categories')
  getTargetCategories(@Query('tenantId') tenantId: string | undefined, @Request() req: any) {
    const targetTenantId = req.user.role === 'SUPER_ADMIN' ? tenantId : req.user.tenantId;
    if (!targetTenantId) throw new BadRequestException('tenantId is required');
    return this.importService.getTargetCategories(targetTenantId);
  }

  @Post('preview')
  @UseInterceptors(FileInterceptor('file', uploadOptions))
  preview(@UploadedFile() file: Express.Multer.File) {
    if (!file) throw new BadRequestException('No file uploaded');
    return this.importService.parseFile(file.buffer);
  }

  // Re-uploads the same file alongside the confirmed column mapping, so
  // the full sheet (not just the 25-row preview) is parsed fresh server
  // side rather than trusting a large row payload sent back as JSON.
  @Post('commit')
  @UseInterceptors(FileInterceptor('file', uploadOptions))
  async commit(
    @UploadedFile() file: Express.Multer.File,
    @Body('categoryId') categoryId: string,
    @Body('mapping') mappingJson: string,
    @Body('mode') mode: 'replace' | 'append',
    @Request() req: any,
  ) {
    if (!file) throw new BadRequestException('No file uploaded');
    if (!categoryId) throw new BadRequestException('categoryId is required');

    let mapping: Record<number, string>;
    try {
      mapping = JSON.parse(mappingJson || '{}');
    } catch {
      throw new BadRequestException('Invalid mapping payload');
    }

    const { rows } = this.importService.parseAllRows(file.buffer);

    return this.importService.commit(
      { categoryId, mapping, rows, mode: mode === 'append' ? 'append' : 'replace' },
      req.user,
    );
  }
}
