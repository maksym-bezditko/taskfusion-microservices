import { Module } from '@nestjs/common';
import { ClientsService } from './clients.service';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ClientEntity } from '@taskfusion-microservices/entities';
import { UsersModule } from '../users/users.module';

@Module({
  imports: [UsersModule, TypeOrmModule.forFeature([ClientEntity])],
  providers: [ClientsService],
})
export class ClientsModule {}
