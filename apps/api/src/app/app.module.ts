import { Module } from '@nestjs/common';
import { AuthModule } from './auth/auth.module';
import { RmqDynamicModule } from '@taskfusion-microservices/modules';

@Module({
  imports: [AuthModule, RmqDynamicModule.register()],
})
export class AppModule {}
