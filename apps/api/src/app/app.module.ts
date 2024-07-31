import { Module } from '@nestjs/common';
import { AuthModule } from './auth/auth.module';
import { RmqDynamicModule } from '@taskfusion-microservices/modules';
import { ProjectsModule } from './projects/projects.module';
import { AtJwtStrategy, RtJwtStrategy } from '@taskfusion-microservices/common';
import { ConfigModule } from '@nestjs/config';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: '.env',
    }),
    RmqDynamicModule.register(),
    AuthModule,
    ProjectsModule,
  ],
  providers: [AtJwtStrategy, RtJwtStrategy],
})
export class AppModule {}
