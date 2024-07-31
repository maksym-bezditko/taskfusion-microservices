import {
  ClientEntity,
  DeveloperEntity,
  PmEntity,
  UserEntity,
} from '@taskfusion-microservices/entities';
import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { getTypeOrmConfig } from '@taskfusion-microservices/helpers';
import { ClientsModule } from './clients/clients.module';
import { DevelopersModule } from './developers/developers.module';
import { PmsModule } from './pms/pms.module';
import { RmqDynamicModule } from '@taskfusion-microservices/modules';
import { JwtModule } from '@nestjs/jwt';

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
    JwtModule.register({
      global: true,
    }),
    RmqDynamicModule.register(),
    ClientsModule,
    DevelopersModule,
    PmsModule,
  ],
})
export class AppModule {}
