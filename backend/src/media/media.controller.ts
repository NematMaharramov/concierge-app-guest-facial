import { Controller, Post, Delete, Param, UploadedFiles, UseInterceptors, UseGuards } from '@nestjs/common';
import { FilesInterceptor } from '@nestjs/platform-express';
import { diskStorage } from 'multer';
import { extname, join } from 'path';
import { v4 as uuidv4 } from 'uuid';
import { MediaService } from './media.service';
import { JwtAuthGuard, RolesGuard, Roles } from '../auth/guards';

const multerOptions = {
  storage: diskStorage({
    destination: (req, file, cb) => {
      const uploadDir = process.env.UPLOAD_DIR || join(process.cwd(), 'uploads');
      cb(null, uploadDir);
    },
    filename: (req, file, cb) => {
      cb(null, `${uuidv4()}${extname(file.originalname)}`);
    },
  }),
  fileFilter: (req: any, file: any, cb: any) => {
    if (!file.mimetype.match(/\/(jpg|jpeg|png|gif|webp)$/)) {
      cb(new Error('Only image files are allowed'), false);
    } else {
      cb(null, true);
    }
  },
  limits: { fileSize: 10 * 1024 * 1024 }, // 10MB
};

@Controller('media')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('ADMIN')
export class MediaController {
  constructor(private mediaService: MediaService) {}

  @Post('services/:id/images')
  @UseInterceptors(FilesInterceptor('images', 10, multerOptions))
  uploadImages(
    @Param('id') id: string,
    @UploadedFiles() files: Express.Multer.File[],
  ) {
    return this.mediaService.addImages(id, files);
  }

  @Delete('images/:imageId')
  removeImage(@Param('imageId') imageId: string) {
    return this.mediaService.removeImage(imageId);
  }
}
