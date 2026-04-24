import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { join } from 'path';
import { existsSync, unlinkSync } from 'fs';

@Injectable()
export class MediaService {
  constructor(private prisma: PrismaService) {}

  async addImages(serviceId: string, files: Express.Multer.File[]) {
    const existing = await this.prisma.service.findUnique({
      where: { id: serviceId },
      // FIX 4: Fetch existing image count so new sortOrder values continue
      // from where the last batch left off, avoiding collisions at index 0
      include: { images: { select: { sortOrder: true }, orderBy: { sortOrder: 'desc' }, take: 1 } },
    });
    if (!existing) throw new NotFoundException('Service not found');

    const nextSortOrder = existing.images.length > 0
      ? existing.images[0].sortOrder + 1
      : 0;

    const images = files.map((f, i) => ({
      serviceId,
      url: `/uploads/${f.filename}`,
      alt: existing.name,
      sortOrder: nextSortOrder + i,
    }));

    return this.prisma.serviceImage.createMany({ data: images });
  }

  async removeImage(imageId: string) {
    const image = await this.prisma.serviceImage.findUnique({ where: { id: imageId } });
    if (!image) throw new NotFoundException('Image not found');

    const uploadDir = process.env.UPLOAD_DIR || join(process.cwd(), 'uploads');
    const filename = image.url.replace('/uploads/', '');
    const filePath = join(uploadDir, filename);
    if (existsSync(filePath)) { try { unlinkSync(filePath); } catch (_) {} }

    return this.prisma.serviceImage.delete({ where: { id: imageId } });
  }
}
