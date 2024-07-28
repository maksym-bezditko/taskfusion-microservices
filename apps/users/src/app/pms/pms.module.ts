import { Module } from '@nestjs/common';
import { PmsService } from './pms.service';
import { PmEntity } from '@taskfusion-microservices/entities';
import { TypeOrmModule } from '@nestjs/typeorm';
import { UsersModule } from '../users/users.module';

@Module({
  imports: [UsersModule, TypeOrmModule.forFeature([PmEntity])],
  providers: [PmsService],
})
export class PmsModule {}
