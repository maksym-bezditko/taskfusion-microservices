import { Module } from '@nestjs/common';

import { AppService } from './app.service';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ProjectsUsersEntity } from '@taskfusion-microservices/entities';
import { getTypeOrmConfig } from '@taskfusion-microservices/helpers';
import { RmqDynamicModule } from '@taskfusion-microservices/modules';

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
        getTypeOrmConfig(configService, [ProjectsUsersEntity]),
    }),
    TypeOrmModule.forFeature([ProjectsUsersEntity]),
    RmqDynamicModule.register(),
  ],
  providers: [AppService],
})
export class AppModule {}
