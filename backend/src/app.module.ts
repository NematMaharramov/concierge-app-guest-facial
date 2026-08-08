import { MiddlewareConsumer, Module, NestModule } from '@nestjs/common';
import { AuthModule } from './auth/auth.module';
import { UsersModule } from './users/users.module';
import { CategoriesModule } from './categories/categories.module';
import { ServicesModule } from './services/services.module';
import { ReservationsModule } from './reservations/reservations.module';
import { AuditModule } from './audit/audit.module';
import { MediaModule } from './media/media.module';
import { SettingsModule } from './settings/settings.module';
import { PrismaModule } from './prisma/prisma.module';
import { TenantsModule } from './tenants/tenants.module';
import { CategoryTemplatesModule } from './category-templates/category-templates.module';
import { FilterGroupsModule } from './filter-groups/filter-groups.module';
import { TenantContextMiddleware } from './tenants/tenant-context.middleware';

@Module({
  imports: [
    PrismaModule,
    TenantsModule,
    CategoryTemplatesModule,
    FilterGroupsModule,
    AuthModule,
    UsersModule,
    CategoriesModule,
    ServicesModule,
    ReservationsModule,
    AuditModule,
    MediaModule,
    SettingsModule,
  ],
})
export class AppModule implements NestModule {
  configure(consumer: MiddlewareConsumer) {
    consumer.apply(TenantContextMiddleware).forRoutes('*');
  }
}
