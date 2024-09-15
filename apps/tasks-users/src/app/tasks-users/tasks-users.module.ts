import { Module } from '@nestjs/common';
import { TasksUsersService } from './tasks-users.service';
import { TypeOrmModule } from '@nestjs/typeorm';
import { TasksUsersEntity } from '@taskfusion-microservices/entities';

@Module({
  imports: [TypeOrmModule.forFeature([TasksUsersEntity])],
  providers: [TasksUsersService],
})
export class TasksUsersModule {}
