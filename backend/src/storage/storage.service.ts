import { Injectable, Logger } from '@nestjs/common';
import { join } from 'path';
import { existsSync, mkdirSync, writeFileSync, unlinkSync } from 'fs';

/**
 * StorageService abstracts "where uploaded files live" behind one
 * interface. This matters on Render specifically: the backend's local disk
 * (`/app/uploads`) is **not persistent** across deploys/restarts — every
 * redeploy silently wipes every uploaded service/category/profile photo.
 * That's the concrete bug Part 8 fixes.
 *
 * When S3-compatible credentials are configured (works for AWS S3,
 * Cloudflare R2, Backblaze B2, DigitalOcean Spaces — anything with an S3
 * API), files go there and survive deploys. Without them, it falls back to
 * local disk exactly as before, so local development needs no extra setup.
 */
@Injectable()
export class StorageService {
  private readonly logger = new Logger(StorageService.name);
  private client: any = null;
  private bucket = process.env.S3_BUCKET;
  private publicUrlBase = (process.env.S3_PUBLIC_URL || '').replace(/\/$/, '');

  get isRemoteConfigured(): boolean {
    return !!(process.env.S3_BUCKET && process.env.S3_ACCESS_KEY_ID && process.env.S3_SECRET_ACCESS_KEY);
  }

  private async getClient() {
    if (this.client) return this.client;
    // Lazy import: keeps @aws-sdk/client-s3 an optional dependency at
    // runtime for anyone who never configures S3 (e.g. pure local dev).
    const { S3Client } = await import('@aws-sdk/client-s3');
    this.client = new S3Client({
      region: process.env.S3_REGION || 'auto',
      endpoint: process.env.S3_ENDPOINT, // e.g. https://<account>.r2.cloudflarestorage.com — omit for real AWS S3
      forcePathStyle: process.env.S3_FORCE_PATH_STYLE === 'true',
      credentials: {
        accessKeyId: process.env.S3_ACCESS_KEY_ID!,
        secretAccessKey: process.env.S3_SECRET_ACCESS_KEY!,
      },
    });
    return this.client;
  }

  private localUploadDir(): string {
    const dir = process.env.UPLOAD_DIR || join(process.cwd(), 'uploads');
    if (!existsSync(dir)) mkdirSync(dir, { recursive: true });
    return dir;
  }

  /**
   * Stores a file and returns the URL to use in API responses/img src.
   * `key` should already include any prefix (e.g. "services/uuid.jpg").
   */
  async upload(buffer: Buffer, key: string, contentType: string): Promise<string> {
    if (this.isRemoteConfigured) {
      try {
        const { PutObjectCommand } = await import('@aws-sdk/client-s3');
        const client = await this.getClient();
        await client.send(new PutObjectCommand({
          Bucket: this.bucket,
          Key: key,
          Body: buffer,
          ContentType: contentType,
          ACL: 'public-read',
        }));
        return this.publicUrlBase ? `${this.publicUrlBase}/${key}` : `/uploads/${key}`;
      } catch (err) {
        this.logger.error(`S3 upload failed for ${key}, falling back to local disk: ${err.message}`);
        // Fall through to local disk so an upload doesn't hard-fail the
        // request just because object storage had a transient issue.
      }
    }

    const dir = this.localUploadDir();
    writeFileSync(join(dir, key), buffer);
    return `/uploads/${key}`;
  }

  async delete(url: string): Promise<void> {
    if (!url) return;
    const key = url.replace(/^https?:\/\/[^/]+\//, '').replace(/^\/uploads\//, '');

    if (this.isRemoteConfigured && this.publicUrlBase && url.startsWith(this.publicUrlBase)) {
      try {
        const { DeleteObjectCommand } = await import('@aws-sdk/client-s3');
        const client = await this.getClient();
        await client.send(new DeleteObjectCommand({ Bucket: this.bucket, Key: key }));
      } catch (err) {
        this.logger.error(`S3 delete failed for ${key}: ${err.message}`);
      }
      return;
    }

    const filePath = join(this.localUploadDir(), key);
    if (existsSync(filePath)) {
      try { unlinkSync(filePath); } catch (_) { /* best-effort */ }
    }
  }
}
