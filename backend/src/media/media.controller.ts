import {
  Controller,
  Post,
  Delete,
  Param,
  UploadedFile,
  UploadedFiles,
  UseInterceptors,
  UseGuards,
  BadRequestException,
  Request,
} from '@nestjs/common';
import { FileInterceptor, FilesInterceptor } from '@nestjs/platform-express';
import { memoryStorage } from 'multer';
import { MediaService } from './media.service';
import { JwtAuthGuard, RolesGuard, Roles } from '../auth/guards';

// Part 8: files now go through StorageService (local disk fallback, or
// S3/R2 when configured) instead of being written straight to disk by
// Multer — so Multer only needs to hold the upload in memory long enough
// to hand the buffer off. See storage/storage.service.ts for why this
// matters on Render specifically (local disk doesn't survive a redeploy).
const imageStorage = memoryStorage();

const imageFilter = (_req: any, file: Express.Multer.File, cb: any) => {
  if (!file.mimetype.match(/^image\/(jpeg|jpg|png|gif|webp)$/)) {
    cb(new BadRequestException('Only image files are allowed (jpeg, png, gif, webp)'), false);
  } else {
    cb(null, true);
  }
};

@Controller('media')
export class MediaController {
  constructor(private mediaService: MediaService) {}

  // ── Service images (Admin only) ─────────────────────────────────
  @Post('services/:id/images')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ADMIN')
  @UseInterceptors(FilesInterceptor('images', 10, {
    storage: imageStorage,
    fileFilter: imageFilter,
    limits: { fileSize: 10 * 1024 * 1024 },
  }))
  async uploadImages(
    @Param('id') id: string,
    @UploadedFiles() files: Express.Multer.File[],
  ) {
    if (!files || files.length === 0) {
      throw new BadRequestException('No valid image files were uploaded');
    }
    return this.mediaService.addImages(id, files);
  }

  @Delete('images/:imageId')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ADMIN')
  removeImage(@Param('imageId') imageId: string) {
    return this.mediaService.removeImage(imageId);
  }

  // ── Category photo (Admin only) ─────────────────────────────────
  @Post('categories/:id/photo')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ADMIN')
  @UseInterceptors(FileInterceptor('photo', {
    storage: imageStorage,
    fileFilter: imageFilter,
    limits: { fileSize: 10 * 1024 * 1024 },
  }))
  async uploadCategoryPhoto(
    @Param('id') id: string,
    @UploadedFile() file: Express.Multer.File,
  ) {
    if (!file) throw new BadRequestException('No image file provided');
    return this.mediaService.setCategoryPhoto(id, file);
  }

  // ── Profile photo (any authenticated user) ──────────────────────
  @Post('profile/photo')
  @UseGuards(JwtAuthGuard)
  @UseInterceptors(FileInterceptor('photo', {
    storage: imageStorage,
    fileFilter: imageFilter,
    limits: { fileSize: 5 * 1024 * 1024 },
  }))
  async uploadProfilePhoto(
    @Request() req: any,
    @UploadedFile() file: Express.Multer.File,
  ) {
    if (!file) throw new BadRequestException('No image file provided');
    return this.mediaService.setProfilePhoto(req.user.id, file);
  }
}
