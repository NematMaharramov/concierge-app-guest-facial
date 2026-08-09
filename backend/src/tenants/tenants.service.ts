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
  @IsString() @IsOptional() customDomain?: string;
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
    if (dto.customDomain) {
      const existing = await this.findByCustomDomain(dto.customDomain);
      if (existing && existing.id !== id) {
        throw new ConflictException(`Domain "${dto.customDomain}" is already in use by another tenant`);
      }
    }
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
  findByCustomDomain(customDomain: string) {
    return this.prisma.tenant.findUnique({ where: { customDomain }, include: { branding: true } });
  }

  /**
   * Tries to resolve a tenant from a single hostname string: first as an
   * exact custom-domain match (e.g. "concierge.fairmontbaku.com"), then as
   * a subdomain of the platform's own domain (e.g. "hilton.ourapp.com" ->
   * slug "hilton"). Bare domains / localhost / IPs are skipped for the
   * subdomain check since they have no meaningful subdomain segment.
   */
  private async resolveHostname(hostname: string) {
    const bare = hostname.split(':')[0];

    const byCustomDomain = await this.findByCustomDomain(bare);
    if (byCustomDomain) return byCustomDomain;

    const parts = bare.split('.');
    if (parts.length > 2) {
      const bySubdomain = await this.findBySlug(parts[0]);
      if (bySubdomain) return bySubdomain;
    }

    return null;
  }

  /**
   * Resolves a tenant for an incoming request using, in order:
   *  1. an explicit `x-tenant-slug` header — exact slug, used by the staff
   *     dashboard and for testing/tooling.
   *  2. `x-tenant-host` — the *browser's* hostname, sent explicitly by the
   *     frontend (see frontend/src/lib/api.ts). This exists because the
   *     backend and frontend are typically deployed as separate Render
   *     services with their own domains: the Host header the backend
   *     itself receives is its own domain, not the one the guest actually
   *     visited, so subdomain/custom-domain routing can't rely on
   *     req.headers.host alone in that topology.
   *  3. `req.headers.host` — still checked as a fallback, for setups where
   *     the backend genuinely does sit behind the tenant's own domain
   *     (e.g. a reverse proxy that preserves the original Host header).
   *  4. DEFAULT_TENANT_SLUG, so the app keeps working exactly as before
   *     wherever no tenant domain has been configured yet.
   */
  async resolveFromRequest(headerSlug: string | undefined, tenantHost: string | undefined, host: string | undefined) {
    if (headerSlug) {
      const bySlug = await this.findBySlug(headerSlug);
      if (bySlug) return bySlug;
    }

    if (tenantHost) {
      const resolved = await this.resolveHostname(tenantHost);
      if (resolved) return resolved;
    }

    if (host) {
      const resolved = await this.resolveHostname(host);
      if (resolved) return resolved;
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
