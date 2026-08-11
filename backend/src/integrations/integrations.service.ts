import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CryptoService } from '../common/crypto.service';
import { IsString, IsOptional } from 'class-validator';
import { OutlookCredentials } from './providers/outlook/outlook.adapter';

export class UpsertOutlookConfigDto {
  @IsString() azureTenantId: string;
  @IsString() clientId: string;
  @IsString() @IsOptional() clientSecret?: string;
  @IsString() senderEmail: string;
  @IsOptional() isActive?: boolean;
}

@Injectable()
export class IntegrationsService {
  constructor(private prisma: PrismaService, private crypto: CryptoService) {}

  async getStatus(tenantId: string, provider: string) {
    const row = await this.prisma.tenantIntegration.findUnique({ where: { tenantId_provider: { tenantId, provider } } });
    if (!row) return { configured: false, isActive: false };
    const config = (row.config as any) || {};
    return { configured: true, isActive: row.isActive, senderEmail: config.senderEmail };
  }

  async upsertOutlookConfig(tenantId: string, dto: UpsertOutlookConfigDto) {
    let clientSecret = dto.clientSecret;
    if (!clientSecret) {
      // Blank secret on an update = "keep the existing one" — re-typing a
      // client secret every time you just want to fix the sender mailbox
      // would be a needless step, and the frontend never gets the
      // decrypted secret back to prefill in the first place.
      const existing = await this.prisma.tenantIntegration.findUnique({ where: { tenantId_provider: { tenantId, provider: 'outlook' } } });
      if (existing?.encryptedCredentials) {
        clientSecret = JSON.parse(this.crypto.decrypt(existing.encryptedCredentials)).clientSecret;
      }
    }
    if (!clientSecret) throw new Error('Client secret is required for first-time setup');

    const encryptedCredentials = this.crypto.encrypt(JSON.stringify({
      azureTenantId: dto.azureTenantId,
      clientId: dto.clientId,
      clientSecret,
    }));
    await this.prisma.tenantIntegration.upsert({
      where: { tenantId_provider: { tenantId, provider: 'outlook' } },
      update: { encryptedCredentials, config: { senderEmail: dto.senderEmail }, isActive: dto.isActive ?? true },
      create: { tenantId, provider: 'outlook', encryptedCredentials, config: { senderEmail: dto.senderEmail }, isActive: dto.isActive ?? true },
    });
    return this.getStatus(tenantId, 'outlook');
  }

  /**
   * Resolves usable Outlook credentials for a tenant: prefers a
   * per-tenant TenantIntegration row; falls back to platform-wide env vars
   * (OUTLOOK_AZURE_TENANT_ID / OUTLOOK_CLIENT_ID / OUTLOOK_CLIENT_SECRET /
   * OUTLOOK_SENDER_EMAIL) so a single Azure App Registration can serve
   * every tenant until/unless a specific brand needs its own mailbox.
   * Returns null if neither is configured — callers must treat that as
   * "Outlook isn't set up yet", not throw a hard error.
   */
  async getOutlookCredentials(tenantId: string): Promise<OutlookCredentials | null> {
    const row = await this.prisma.tenantIntegration.findUnique({ where: { tenantId_provider: { tenantId, provider: 'outlook' } } });
    if (row?.isActive && row.encryptedCredentials) {
      const decrypted = JSON.parse(this.crypto.decrypt(row.encryptedCredentials));
      const config = (row.config as any) || {};
      if (decrypted.clientId && config.senderEmail) {
        return { ...decrypted, senderEmail: config.senderEmail };
      }
    }

    const { OUTLOOK_AZURE_TENANT_ID, OUTLOOK_CLIENT_ID, OUTLOOK_CLIENT_SECRET, OUTLOOK_SENDER_EMAIL } = process.env;
    if (OUTLOOK_AZURE_TENANT_ID && OUTLOOK_CLIENT_ID && OUTLOOK_CLIENT_SECRET && OUTLOOK_SENDER_EMAIL) {
      return {
        azureTenantId: OUTLOOK_AZURE_TENANT_ID,
        clientId: OUTLOOK_CLIENT_ID,
        clientSecret: OUTLOOK_CLIENT_SECRET,
        senderEmail: OUTLOOK_SENDER_EMAIL,
      };
    }

    return null;
  }
}
