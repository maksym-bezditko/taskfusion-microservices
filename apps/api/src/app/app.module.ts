import { Module } from '@nestjs/common';
import { AuthModule } from './auth/auth.module';
import { RmqDynamicModule } from '@taskfusion-microservices/modules';
import { ProjectsModule } from './projects/projects.module';

@Module({
  imports: [RmqDynamicModule.register(), AuthModule, ProjectsModule],
})
export class AppModule {}
