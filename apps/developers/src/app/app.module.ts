import { Module } from '@nestjs/common';

import { AppController } from './app.controller';
import { AppService } from './app.service';
import { DeveloperEntity } from '@taskfusion-microservices/entities';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
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
        getTypeOrmConfig(configService, [DeveloperEntity]),
    }),
    TypeOrmModule.forFeature([DeveloperEntity]),
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
