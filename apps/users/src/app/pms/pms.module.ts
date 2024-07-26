import { Module } from '@nestjs/common';
import { PmsService } from './pms.service';
import { PmsController } from './pms.controller';

@Module({
  controllers: [PmsController],
  providers: [PmsService],
})
export class PmsModule {}
