import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

// Fallback tenant used while the platform still runs on a single Render
// domain (no per-tenant subdomains yet — that lands in a later Part).
// Keeps existing single-brand behaviour working unchanged until real
// domain routing is implemented.
export const DEFAULT_TENANT_SLUG = process.env.DEFAULT_TENANT_SLUG || 'raffles-praslin';

@Injectable()
export class TenantsService {
  constructor(private prisma: PrismaService) {}

  findAll() {
    return this.prisma.tenant.findMany({ orderBy: { createdAt: 'asc' }, include: { branding: true } });
  }

  async findById(id: string) {
    const tenant = await this.prisma.tenant.findUnique({ where: { id }, include: { branding: true } });
    if (!tenant) throw new NotFoundException('Tenant not found');
    return tenant;
  }

  findBySlug(slug: string) {
    return this.prisma.tenant.findUnique({ where: { slug }, include: { branding: true } });
  }

  /**
   * Resolves a tenant for an incoming request using, in order:
   *  1. an explicit `x-tenant-slug` header (used by staff dashboard / testing)
   *  2. the subdomain of the Host header (e.g. hilton.ourapp.com -> "hilton")
   *  3. DEFAULT_TENANT_SLUG, so the app keeps working exactly as before on
   *     the current single Render domain.
   */
  async resolveFromRequest(headerSlug: string | undefined, host: string | undefined) {
    if (headerSlug) {
      const bySlug = await this.findBySlug(headerSlug);
      if (bySlug) return bySlug;
    }

    if (host) {
      const hostname = host.split(':')[0];
      const parts = hostname.split('.');
      // Only treat it as a subdomain if there's actually a subdomain segment
      // (skip bare domains / localhost / IP addresses).
      if (parts.length > 2) {
        const subdomain = parts[0];
        const bySubdomain = await this.findBySlug(subdomain);
        if (bySubdomain) return bySubdomain;
      }
    }

    return this.findBySlug(DEFAULT_TENANT_SLUG);
  }

  async getOrCreateDefaultTenant() {
    const existing = await this.findBySlug(DEFAULT_TENANT_SLUG);
    if (existing) return existing;
    return this.prisma.tenant.create({
      data: { name: 'Raffles Praslin (Demo)', slug: DEFAULT_TENANT_SLUG },
    });
  }
}
