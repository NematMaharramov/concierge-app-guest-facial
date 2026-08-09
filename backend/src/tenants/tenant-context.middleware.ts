import { Injectable, NestMiddleware } from '@nestjs/common';
import { Request, Response, NextFunction } from 'express';
import { TenantsService } from './tenants.service';

// Augment Express Request so the rest of the app can read req.tenant
// without casting to `any` everywhere.
declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace Express {
    interface Request {
      tenant?: { id: string; slug: string; name: string };
    }
  }
}

@Injectable()
export class TenantContextMiddleware implements NestMiddleware {
  constructor(private tenantsService: TenantsService) {}

  async use(req: Request, _res: Response, next: NextFunction) {
    try {
      const headerSlug = (req.headers['x-tenant-slug'] as string) || undefined;
      const tenantHost = (req.headers['x-tenant-host'] as string) || undefined;
      const host = req.headers.host;
      const tenant = await this.tenantsService.resolveFromRequest(headerSlug, tenantHost, host);
      if (tenant) {
        req.tenant = { id: tenant.id, slug: tenant.slug, name: tenant.name };
      }
    } catch {
      // Tenant resolution must never crash the request pipeline — if it
      // fails, req.tenant stays undefined and downstream guards/services
      // decide how to handle the missing context.
    }
    next();
  }
}
