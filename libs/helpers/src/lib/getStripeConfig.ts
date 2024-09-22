import { StripeModuleConfig } from '@golevelup/nestjs-stripe';
import { ConfigService } from '@nestjs/config';

export const getStripeConfig = (
  configService: ConfigService
): Promise<StripeModuleConfig> | StripeModuleConfig => {
  return {
		apiKey: configService.getOrThrow('STRIPE_SECRET_KEY'),
  };
};
