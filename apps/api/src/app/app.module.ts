import { Module } from '@nestjs/common';
import { AuthModule } from './auth/auth.module';
import { KafkaDynamicModule } from '@taskfusion-microservices/modules';

@Module({
  imports: [
    KafkaDynamicModule.register({
      name: 'USERS_SERVICE',
      clientId: 'users',
      brokers: ['localhost:9092'],
      groupId: 'users',
    }),
    AuthModule,
  ],
})
export class AppModule {}
