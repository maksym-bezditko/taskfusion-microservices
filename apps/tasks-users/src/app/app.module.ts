import { Module } from '@nestjs/common';

import { AppService } from './app.service';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { getTypeOrmConfig } from '@taskfusion-microservices/helpers';
import { RmqDynamicModule } from '@taskfusion-microservices/modules';
import { TasksUsersEntity } from '@taskfusion-microservices/entities';

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
        getTypeOrmConfig(configService, [TasksUsersEntity]),
    }),
    TypeOrmModule.forFeature([TasksUsersEntity]),
    RmqDynamicModule.register(),
  ],
  providers: [AppService],
})
export class AppModule {}
