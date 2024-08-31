import { Module } from '@nestjs/common';

import { AppService } from './app.service';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import {
  PmInviteEntity,
  DeveloperInviteEntity,
  ProjectEntity,
} from '@taskfusion-microservices/entities';
import { getTypeOrmConfig } from '@taskfusion-microservices/helpers';
import { RmqDynamicModule } from '@taskfusion-microservices/modules';
import { InvitesModule } from './invites/invites.module';

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
          ProjectEntity,
          PmInviteEntity,
          DeveloperInviteEntity,
        ]),
    }),
    TypeOrmModule.forFeature([ProjectEntity]),
    RmqDynamicModule.register(),
    InvitesModule,
  ],
  providers: [AppService],
  exports: [AppService],
})
export class AppModule {}
