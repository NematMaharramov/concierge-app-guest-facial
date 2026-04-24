import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { AppModule } from './app.module';
import { join } from 'path';
import { existsSync, mkdirSync } from 'fs';
import { NestExpressApplication } from '@nestjs/platform-express';

async function bootstrap() {
  const app = await NestFactory.create<NestExpressApplication>(AppModule);

  app.useGlobalPipes(new ValidationPipe({ whitelist: true, transform: true }));

  app.enableCors({
    origin: process.env.FRONTEND_URL || '*',
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
    credentials: true,
  });

  // Ensure the upload directory exists before serving static assets or
  // accepting file uploads — prevents 500 errors on first boot.
  const uploadDir = process.env.UPLOAD_DIR || join(process.cwd(), 'uploads');
  if (!existsSync(uploadDir)) {
    mkdirSync(uploadDir, { recursive: true });
    console.log(`📁  Created upload directory: ${uploadDir}`);
  }

  // Serve uploaded files statically at /uploads/*
  app.useStaticAssets(uploadDir, { prefix: '/uploads' });

  const port = process.env.PORT || 4000;
  await app.listen(port);
  console.log(`🚀  Backend running on port ${port}`);
}
bootstrap();
