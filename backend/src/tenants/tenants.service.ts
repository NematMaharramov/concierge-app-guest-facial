import { Injectable, NotFoundException, ConflictException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CategoryTemplatesService } from '../category-templates/category-templates.service';
import { BusinessVertical } from '@prisma/client';
import { IsString, IsOptional, IsEnum } from 'class-validator';

// Fallback tenant used while the platform still runs on a single Render
// domain (no per-tenant subdomains yet — that lands in a later Part).
// Keeps existing single-brand behaviour working unchanged until real
// domain routing is implemented.
export const DEFAULT_TENANT_SLUG = process.env.DEFAULT_TENANT_SLUG || 'raffles-praslin';

export class CreateTenantDto {
  @IsString() name: string;
  @IsString() slug: string;
  @IsEnum(['RESORT_LEISURE', 'BUSINESS_CITY_HOTEL', 'BOUTIQUE_HOTEL', 'CUSTOM']) @IsOptional() businessVertical?: BusinessVertical;
}

@Injectable()
export class TenantsService {
  constructor(
    private prisma: PrismaService,
    private categoryTemplatesService: CategoryTemplatesService,
  ) {}

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
   * Creates a new Tenant and, when a Business Vertical is given, immediately
   * populates its category list from the matching CategoryTemplate library
   * (Part 2). This is the data-layer half of the Super Admin "create tenant"
   * wizard — the wizard UI itself belongs to Part 7.
   */
  async create(dto: CreateTenantDto) {
    const existing = await this.findBySlug(dto.slug);
    if (existing) throw new ConflictException(`A tenant with slug "${dto.slug}" already exists`);

    const tenant = await this.prisma.tenant.create({
      data: { name: dto.name, slug: dto.slug, businessVertical: dto.businessVertical },
    });

    const categories = await this.categoryTemplatesService.instantiateForTenant(tenant.id, dto.businessVertical);

    return { ...tenant, categories };
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
