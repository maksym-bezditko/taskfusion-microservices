import { Module } from '@nestjs/common';

import { AppService } from './app.service';
import { ActionEntity } from '@taskfusion-microservices/entities';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
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
        getTypeOrmConfig(configService, [ActionEntity]),
    }),
    TypeOrmModule.forFeature([ActionEntity]),
    RmqDynamicModule.register(),
  ],
  providers: [AppService],
})
export class AppModule {}
