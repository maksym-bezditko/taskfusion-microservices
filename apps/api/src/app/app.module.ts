import { Module } from '@nestjs/common';
import { AuthModule } from './auth/auth.module';
import { RmqDynamicModule } from '@taskfusion-microservices/modules';
import { ProjectsModule } from './projects/projects.module';
import { AtJwtStrategy, RtJwtStrategy } from '@taskfusion-microservices/common';
import { ConfigModule } from '@nestjs/config';
import { UsersModule } from './users/users.module';
import { TasksModule } from './tasks/tasks.module';
import { ActionsModule } from './actions/actions.module';
import { CommentsModule } from './comments/comments.module';
import { PaymentsModule } from './payments/payments.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: '.env',
    }),
    RmqDynamicModule.register(),
    AuthModule,
    ProjectsModule,
    UsersModule,
    TasksModule,
    ActionsModule,
    CommentsModule,
    PaymentsModule,
  ],
  providers: [AtJwtStrategy, RtJwtStrategy],
})
export class AppModule {}
