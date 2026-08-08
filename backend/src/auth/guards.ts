import { Injectable, CanActivate, ExecutionContext, SetMetadata, ForbiddenException } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { Reflector } from '@nestjs/core';

@Injectable()
export class JwtAuthGuard extends AuthGuard('jwt') {}

export const Roles = (...roles: string[]) => SetMetadata('roles', roles);

@Injectable()
export class RolesGuard implements CanActivate {
  constructor(private reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const requiredRoles = this.reflector.getAllAndOverride<string[]>('roles', [
      context.getHandler(),
      context.getClass(),
    ]);
    if (!requiredRoles) return true;
    const { user } = context.switchToHttp().getRequest();
    if (!requiredRoles.includes(user?.role)) {
      throw new ForbiddenException('Insufficient permissions');
    }
    return true;
  }
}

/**
 * TenantGuard — defense-in-depth for tenant isolation on authenticated
 * routes. Must run after JwtAuthGuard (needs req.user) and after
 * TenantContextMiddleware (needs req.tenant, resolved from host/header).
 *
 * It does NOT do the actual data scoping — that happens in each service's
 * queries using req.user.tenantId. Its job is to reject requests where the
 * authenticated user's tenant and the resolved request tenant disagree,
 * which would otherwise let a user hit another tenant's subdomain with
 * their own token.
 *
 * While the platform still runs on a single domain (pre subdomain-routing),
 * req.tenant always resolves to the default tenant, so this stays a no-op
 * for the existing deployment and only becomes strict once real per-tenant
 * domains are wired up.
 */
@Injectable()
export class TenantGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    const req = context.switchToHttp().getRequest();
    const { user, tenant } = req;

    if (!user?.tenantId) {
      // Legacy/un-backfilled account — allow through rather than locking
      // everyone out; the backfill script is expected to close this gap.
      return true;
    }

    if (tenant?.id && tenant.id !== user.tenantId) {
      throw new ForbiddenException('This account does not belong to this tenant');
    }

    return true;
  }
}
