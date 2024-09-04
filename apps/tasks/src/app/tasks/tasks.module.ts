import { Module } from '@nestjs/common';
import { TasksService } from './tasks.service';
import { TypeOrmModule } from '@nestjs/typeorm';
import { TaskEntity } from '@taskfusion-microservices/entities';

@Module({
  imports: [TypeOrmModule.forFeature([TaskEntity])],
  providers: [TasksService],
  exports: [TasksService],
})
export class TasksModule {}
