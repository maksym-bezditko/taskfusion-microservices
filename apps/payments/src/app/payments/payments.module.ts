import { Module } from '@nestjs/common';
import { PaymentsService } from './payments.service';
import { StripeModule } from '@golevelup/nestjs-stripe';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { getStripeConfig } from '@taskfusion-microservices/helpers';

@Module({
  imports: [
    StripeModule.forRootAsync(StripeModule, {
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: getStripeConfig,
    }),
  ],
  providers: [PaymentsService],
})
export class PaymentsModule {}
