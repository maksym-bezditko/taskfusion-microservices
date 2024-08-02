import { Module } from '@nestjs/common';
import { AuthModule } from './auth/auth.module';
import { RmqDynamicModule } from '@taskfusion-microservices/modules';
import { ProjectsModule } from './projects/projects.module';
import { AtJwtStrategy, RtJwtStrategy } from '@taskfusion-microservices/common';
import { ConfigModule } from '@nestjs/config';
import { UsersModule } from './users/users.module';

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
  ],
  providers: [AtJwtStrategy, RtJwtStrategy],
})
export class AppModule {}
