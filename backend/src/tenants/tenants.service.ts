import { Injectable, NotFoundException, ConflictException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CategoryTemplatesService } from '../category-templates/category-templates.service';
import { UsersService } from '../users/users.service';
import { BusinessVertical } from '@prisma/client';
import { IsString, IsOptional, IsEnum, IsEmail, MinLength } from 'class-validator';

// Fallback tenant used while the platform still runs on a single Render
// domain (no per-tenant subdomains yet — that lands in a later Part).
// Keeps existing single-brand behaviour working unchanged until real
// domain routing is implemented.
export const DEFAULT_TENANT_SLUG = process.env.DEFAULT_TENANT_SLUG || 'raffles-praslin';

export class CreateTenantDto {
  @IsString() name: string;
  @IsString() slug: string;
  @IsEnum(['RESORT_LEISURE', 'BUSINESS_CITY_HOTEL', 'BOUTIQUE_HOTEL', 'CUSTOM']) @IsOptional() businessVertical?: BusinessVertical;
  // Optional — lets the Super Admin bootstrap the tenant's first login in
  // the same step instead of a separate "invite" flow (not specified yet).
  @IsEmail() @IsOptional() adminEmail?: string;
  @IsString() @MinLength(8) @IsOptional() adminPassword?: string;
  @IsString() @IsOptional() adminName?: string;
}

export class UpdateTenantDto {
  @IsString() @IsOptional() name?: string;
  @IsOptional() isActive?: boolean;
}

export class UpsertTenantBrandingDto {
  @IsString() @IsOptional() logoUrl?: string;
  @IsString() @IsOptional() primaryColor?: string;
  @IsString() @IsOptional() accentColor?: string;
  @IsString() @IsOptional() siteTitle?: string;
  @IsString() @IsOptional() siteSubtitle?: string;
}

// Known platform modules a Super Admin can toggle per tenant. Consumers
// (e.g. a future staff-utility module) look up by these keys; the list is
// intentionally just data so adding a new module later doesn't need a
// schema change.
export const KNOWN_FEATURE_FLAGS = [
  { key: 'excel_import', label: 'Excel Import Tool' },
  { key: 'monthly_events', label: 'Monthly Events List' },
  { key: 'pre_arrival_letters', label: 'Pre-Arrival Letters' },
  { key: 'taxi_directory', label: 'Taxi Driver Directory' },
  { key: 'phone_directory', label: 'Phone Directory' },
  { key: 'price_sheets', label: 'Price Sheets' },
] as const;

export class SetFeatureFlagDto {
  @IsString() key: string;
  @IsOptional() enabled?: boolean;
}

@Injectable()
export class TenantsService {
  constructor(
    private prisma: PrismaService,
    private categoryTemplatesService: CategoryTemplatesService,
    private usersService: UsersService,
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

    let admin = null;
    if (dto.adminEmail && dto.adminPassword) {
      admin = await this.usersService.create(
        { email: dto.adminEmail, password: dto.adminPassword, name: dto.adminName || 'Admin', role: 'ADMIN' },
        tenant.id,
      );
    }

    return { ...tenant, categories, admin };
  }

  async update(id: string, dto: UpdateTenantDto) {
    await this.findById(id);
    return this.prisma.tenant.update({ where: { id }, data: dto, include: { branding: true } });
  }

  async getBranding(tenantId: string) {
    await this.findById(tenantId);
    return this.prisma.tenantBranding.findUnique({ where: { tenantId } });
  }

  async upsertBranding(tenantId: string, dto: UpsertTenantBrandingDto) {
    await this.findById(tenantId);
    return this.prisma.tenantBranding.upsert({
      where: { tenantId },
      update: dto,
      create: { tenantId, ...dto },
    });
  }

  async getFeatureFlags(tenantId: string) {
    await this.findById(tenantId);
    const rows = await this.prisma.tenantFeatureFlag.findMany({ where: { tenantId } });
    const byKey = new Map(rows.map((r) => [r.key, r.enabled]));
    // Always return every known flag, defaulting to false, so the UI has a
    // stable checklist regardless of what's actually been toggled yet.
    return KNOWN_FEATURE_FLAGS.map((f) => ({ ...f, enabled: byKey.get(f.key) ?? false }));
  }

  async setFeatureFlag(tenantId: string, dto: SetFeatureFlagDto) {
    await this.findById(tenantId);
    return this.prisma.tenantFeatureFlag.upsert({
      where: { tenantId_key: { tenantId, key: dto.key } },
      update: { enabled: dto.enabled ?? false },
      create: { tenantId, key: dto.key, enabled: dto.enabled ?? false },
    });
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
