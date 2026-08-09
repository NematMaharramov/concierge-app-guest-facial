import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { StorageService } from '../storage/storage.service';
import { v4 as uuidv4 } from 'uuid';
import { extname } from 'path';

@Injectable()
export class MediaService {
  constructor(private prisma: PrismaService, private storage: StorageService) {}

  private keyFor(prefix: string, originalname: string): string {
    const ext = extname(originalname).toLowerCase();
    return `${prefix}/${uuidv4()}${ext}`;
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

    const uploaded = await Promise.all(
      files.map((f) => this.storage.upload(f.buffer, this.keyFor('services', f.originalname), f.mimetype)),
    );

    const images = uploaded.map((url, i) => ({
      serviceId,
      url,
      alt: existing.name,
      sortOrder: nextSortOrder + i,
    }));

    return this.prisma.serviceImage.createMany({ data: images });
  }

  async removeImage(imageId: string) {
    const image = await this.prisma.serviceImage.findUnique({ where: { id: imageId } });
    if (!image) throw new NotFoundException('Image not found');
    await this.storage.delete(image.url);
    return this.prisma.serviceImage.delete({ where: { id: imageId } });
  }

  async setCategoryPhoto(categoryId: string, file: Express.Multer.File) {
    const category = await this.prisma.category.findUnique({ where: { id: categoryId } });
    if (!category) throw new NotFoundException('Category not found');

    if (category.photo) {
      await this.storage.delete(category.photo);
    }

    const photoUrl = await this.storage.upload(file.buffer, this.keyFor('categories', file.originalname), file.mimetype);
    return this.prisma.category.update({
      where: { id: categoryId },
      data: { photo: photoUrl },
    });
  }

  async setProfilePhoto(userId: string, file: Express.Multer.File) {
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user) throw new NotFoundException('User not found');

    if (user.profilePhoto) {
      await this.storage.delete(user.profilePhoto);
    }

    const photoUrl = await this.storage.upload(file.buffer, this.keyFor('profiles', file.originalname), file.mimetype);
    return this.prisma.user.update({
      where: { id: userId },
      data: { profilePhoto: photoUrl },
      select: { id: true, email: true, name: true, role: true, isActive: true, profilePhoto: true, createdAt: true },
    });
  }
}
