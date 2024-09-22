import { RabbitRPC } from '@golevelup/nestjs-rabbitmq';
import { InjectStripeClient } from '@golevelup/nestjs-stripe';
import { Injectable } from '@nestjs/common';
import { BaseService } from '@taskfusion-microservices/common';
import { CreateCheckoutSessionContract } from '@taskfusion-microservices/contracts';
import Stripe from 'stripe';

@Injectable()
export class PaymentsService extends BaseService {
  constructor(@InjectStripeClient() private readonly stripeClient: Stripe) {
    super(PaymentsService.name);
  }

  @RabbitRPC({
    exchange: CreateCheckoutSessionContract.exchange,
    routingKey: CreateCheckoutSessionContract.routingKey,
    queue: CreateCheckoutSessionContract.queue,
  })
  async createCheckoutSessionRpcHandler(
    dto: CreateCheckoutSessionContract.Dto
  ) {
    this.logger.log(`Checkout session created`, dto);

    return this.createCheckoutSession();
  }

  private async createCheckoutSession() {
    const session = await this.stripeClient.checkout.sessions.create({
      mode: 'payment',
      line_items: [
        {
          quantity: 1,
          price_data: {
            currency: 'usd',
            product_data: {
              name: 'T-shirt',
              images: [
                'https://cdn.militaria.pl/media/catalog/product/cache/e452159aead1684753d5e9341f2edeb6/9/8/98993_t-shirt-helikon-olive-ts-tsh-co-02.jpg',
              ],
              description: 'T-Shirt for testing purposes',
            },
            unit_amount: 200000,

          },
        },
      ],
      success_url: 'http://localhost:3000/success',
      cancel_url: 'http://localhost:3000/cancel',
    });

    return session;
  }
}
