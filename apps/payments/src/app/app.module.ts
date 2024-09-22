import { Module } from '@nestjs/common';

import { ConfigModule, ConfigService } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { PaymentEntity } from '@taskfusion-microservices/entities';
import { getTypeOrmConfig } from '@taskfusion-microservices/helpers';
import { PaymentsModule } from './payments/payments.module';
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
        getTypeOrmConfig(configService, [PaymentEntity]),
    }),
    RmqDynamicModule.register(),
    TypeOrmModule.forFeature([PaymentEntity]),
    PaymentsModule,
  ],
})
export class AppModule {}
