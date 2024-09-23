import { Module } from '@nestjs/common';
import { PaymentsService } from './payments.service';
import { StripeModule } from '@golevelup/nestjs-stripe';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { getStripeConfig } from '@taskfusion-microservices/helpers';
import { TypeOrmModule } from '@nestjs/typeorm';
import { PaymentRequestEntity } from '@taskfusion-microservices/entities';

@Module({
  imports: [
    StripeModule.forRootAsync(StripeModule, {
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: getStripeConfig,
    }),
    TypeOrmModule.forFeature([PaymentRequestEntity]),
  ],
  providers: [PaymentsService],
})
export class PaymentsModule {}
