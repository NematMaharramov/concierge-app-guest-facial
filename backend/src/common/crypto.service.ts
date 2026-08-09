import { Injectable, Logger } from '@nestjs/common';
import { createCipheriv, createDecipheriv, randomBytes, scryptSync } from 'crypto';

/**
 * CryptoService — symmetric encryption for secrets that must be stored at
 * rest (e.g. an Outlook OAuth refresh token, an Opera PMS API key), so a
 * database leak alone doesn't hand out live credentials.
 *
 * Nothing in the codebase calls this yet — no credentials table exists
 * until the integrations work in Part 5 — but Part 8 explicitly asks for
 * "credential şifrələməsi" as reusable infrastructure, so it's built and
 * ready ahead of that.
 *
 * Usage (future): const enc = cryptoService.encrypt(accessToken); ...store
 * enc in the DB...; later: const plain = cryptoService.decrypt(enc);
 *
 * Requires an ENCRYPTION_KEY env var (any non-empty string — it's run
 * through scrypt to derive a proper 32-byte AES-256 key, so it doesn't
 * need to be hex/base64 or a specific length). In its absence, a random
 * per-process key is generated so the app still boots in dev — but
 * anything encrypted with that key becomes unreadable after a restart, so
 * production MUST set ENCRYPTION_KEY explicitly.
 */
@Injectable()
export class CryptoService {
  private readonly logger = new Logger(CryptoService.name);
  private readonly key: Buffer;

  constructor() {
    const secret = process.env.ENCRYPTION_KEY;
    if (!secret) {
      this.logger.warn(
        'ENCRYPTION_KEY is not set — using a random per-process key. ' +
        'Anything encrypted now will NOT be decryptable after a restart. ' +
        'Set ENCRYPTION_KEY in production before storing any real credentials.',
      );
    }
    this.key = scryptSync(secret || randomBytes(32).toString('hex'), 'concierge-platform-salt', 32);
  }

  encrypt(plaintext: string): string {
    const iv = randomBytes(12); // AES-GCM standard IV size
    const cipher = createCipheriv('aes-256-gcm', this.key, iv);
    const ciphertext = Buffer.concat([cipher.update(plaintext, 'utf8'), cipher.final()]);
    const authTag = cipher.getAuthTag();
    // Pack iv + authTag + ciphertext together so callers only store one string.
    return Buffer.concat([iv, authTag, ciphertext]).toString('base64');
  }

  decrypt(encoded: string): string {
    const raw = Buffer.from(encoded, 'base64');
    const iv = raw.subarray(0, 12);
    const authTag = raw.subarray(12, 28);
    const ciphertext = raw.subarray(28);
    const decipher = createDecipheriv('aes-256-gcm', this.key, iv);
    decipher.setAuthTag(authTag);
    return Buffer.concat([decipher.update(ciphertext), decipher.final()]).toString('utf8');
  }
}
