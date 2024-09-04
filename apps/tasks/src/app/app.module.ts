import { Module } from '@nestjs/common';

import { ConfigModule, ConfigService } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import {
  ActionEntity,
  CommentEntity,
  TaskEntity,
} from '@taskfusion-microservices/entities';
import { getTypeOrmConfig } from '@taskfusion-microservices/helpers';
import { RmqDynamicModule } from '@taskfusion-microservices/modules';
import { ActionsModule } from './actions/actions.module';
import { CommentsModule } from './comments/comments.module';
import { TasksModule } from './tasks/tasks.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: '.env',
    }),
    TypeOrmModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (configService: ConfigService) =>
        getTypeOrmConfig(configService, [
          TaskEntity,
          ActionEntity,
          CommentEntity,
        ]),
    }),
    RmqDynamicModule.register(),
    ActionsModule,
    CommentsModule,
    TasksModule,
  ],
})
export class AppModule {}
