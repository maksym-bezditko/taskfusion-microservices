import { Module } from '@nestjs/common';
import { CommentsService } from './comments.service';
import { CommentEntity } from '@taskfusion-microservices/entities';
import { TypeOrmModule } from '@nestjs/typeorm';
import { TasksModule } from '../tasks/tasks.module';

@Module({
  imports: [TypeOrmModule.forFeature([CommentEntity]), TasksModule],
  providers: [CommentsService],
})
export class CommentsModule {}
