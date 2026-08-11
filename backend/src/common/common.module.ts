import { Global, Module } from '@nestjs/common';
import { CryptoService } from './crypto.service';
import { WeatherService } from './weather.service';

@Global()
@Module({
  providers: [CryptoService, WeatherService],
  exports: [CryptoService, WeatherService],
})
export class CommonModule {}
