import { Module } from '@nestjs/common';
import { IntegrationsService } from './integrations.service';
import { IntegrationsController } from './integrations.controller';
import { OutlookAdapter } from './providers/outlook/outlook.adapter';

@Module({
  providers: [IntegrationsService, OutlookAdapter],
  controllers: [IntegrationsController],
  exports: [IntegrationsService, OutlookAdapter],
})
export class IntegrationsModule {}
