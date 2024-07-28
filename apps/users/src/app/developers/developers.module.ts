import { Module } from '@nestjs/common';
import { DevelopersService } from './developers.service';
import { UsersModule } from '../users/users.module';
import { TypeOrmModule } from '@nestjs/typeorm';
import { DeveloperEntity } from '@taskfusion-microservices/entities';

@Module({
  imports: [UsersModule, TypeOrmModule.forFeature([DeveloperEntity])],
  providers: [DevelopersService],
})
export class DevelopersModule {}
