import { Module } from '@nestjs/common';
import { AuthModule } from './auth/auth.module';
import { RmqDynamicModule } from '@taskfusion-microservices/modules';

@Module({
  imports: [
    RmqDynamicModule.register({
      name: 'USERS_SERVICE',
      queue: 'users-queue',
      queueOptions: {
        durable: true,
      },
    }),
    AuthModule,
  ],
})
export class AppModule {}
