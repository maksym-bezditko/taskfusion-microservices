import {
  ClientEntity,
  DeveloperEntity,
  PmEntity,
  UserEntity,
} from '@taskfusion-microservices/entities';
import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

import { AppController } from './app.controller';
import { AppService } from './app.service';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { getTypeOrmConfig } from '@taskfusion-microservices/helpers';

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
          UserEntity,
          ClientEntity,
          DeveloperEntity,
          PmEntity,
        ]),
    }),
    TypeOrmModule.forFeature([
      UserEntity,
      ClientEntity,
      DeveloperEntity,
      PmEntity,
    ]),
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
