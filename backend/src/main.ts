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
    // Part 8 introduced per-tenant custom domains — a single fixed
    // FRONTEND_URL can't cover every tenant's own domain, so the origin
    // is reflected dynamically instead of pinned to one value. This app
    // authenticates via a Bearer JWT (not cookies), so there's no
    // ambient-credential/CSRF exposure from being permissive here.
    origin: true,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    // x-tenant-slug / x-tenant-host (Parts 1 & 8) must be explicitly
    // allowed or the browser's CORS preflight silently blocks every
    // request that carries them — which is every request, since the
    // frontend's axios interceptor adds x-tenant-host to all of them.
    allowedHeaders: ['Content-Type', 'Authorization', 'x-tenant-slug', 'x-tenant-host'],
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
