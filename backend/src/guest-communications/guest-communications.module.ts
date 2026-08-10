import { Module } from '@nestjs/common';
import { GuestCommunicationsService } from './guest-communications.service';
import { GuestCommunicationsController } from './guest-communications.controller';
import { IntegrationsModule } from '../integrations/integrations.module';

@Module({
  imports: [IntegrationsModule],
  providers: [GuestCommunicationsService],
  controllers: [GuestCommunicationsController],
})
export class GuestCommunicationsModule {}
