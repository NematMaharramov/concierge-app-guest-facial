import { Module } from '@nestjs/common';
import { LetterTemplatesService } from './letter-templates.service';
import { LetterTemplatesController } from './letter-templates.controller';

@Module({
  providers: [LetterTemplatesService],
  controllers: [LetterTemplatesController],
  exports: [LetterTemplatesService],
})
export class LetterTemplatesModule {}
