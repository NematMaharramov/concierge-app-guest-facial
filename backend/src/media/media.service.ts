import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { join } from 'path';
import { existsSync, unlinkSync } from 'fs';

@Injectable()
export class MediaService {
  constructor(private prisma: PrismaService) {}

  private deleteFile(url: string) {
    if (!url) return;
    const uploadDir = process.env.UPLOAD_DIR || join(process.cwd(), 'uploads');
    const filename = url.replace('/uploads/', '');
    const filePath = join(uploadDir, filename);
    if (existsSync(filePath)) { try { unlinkSync(filePath); } catch (_) {} }
  }

  async addImages(serviceId: string, files: Express.Multer.File[]) {
    const existing = await this.prisma.service.findUnique({
      where: { id: serviceId },
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
    this.deleteFile(image.url);
    return this.prisma.serviceImage.delete({ where: { id: imageId } });
  }

  async setCategoryPhoto(categoryId: string, file: Express.Multer.File) {
    const category = await this.prisma.category.findUnique({ where: { id: categoryId } });
    if (!category) throw new NotFoundException('Category not found');

    // Delete old photo file if it was an upload
    if (category.photo && category.photo.startsWith('/uploads/')) {
      this.deleteFile(category.photo);
    }

    const photoUrl = `/uploads/${file.filename}`;
    return this.prisma.category.update({
      where: { id: categoryId },
      data: { photo: photoUrl },
    });
  }

  async setProfilePhoto(userId: string, file: Express.Multer.File) {
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user) throw new NotFoundException('User not found');

    // Delete old profile photo if it was an upload
    if (user.profilePhoto && user.profilePhoto.startsWith('/uploads/')) {
      this.deleteFile(user.profilePhoto);
    }

    const photoUrl = `/uploads/${file.filename}`;
    return this.prisma.user.update({
      where: { id: userId },
      data: { profilePhoto: photoUrl },
      select: { id: true, email: true, name: true, role: true, isActive: true, profilePhoto: true, createdAt: true },
    });
  }
}
