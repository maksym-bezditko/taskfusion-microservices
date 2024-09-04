import { Module } from '@nestjs/common';
import { ActionsService } from './actions.service';
import { ActionEntity } from '@taskfusion-microservices/entities';
import { TypeOrmModule } from '@nestjs/typeorm';
import { TasksModule } from '../tasks/tasks.module';

@Module({
  imports: [TypeOrmModule.forFeature([ActionEntity]), TasksModule],
  providers: [ActionsService],
})
export class ActionsModule {}
