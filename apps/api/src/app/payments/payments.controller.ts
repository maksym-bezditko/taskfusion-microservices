import { Body, Controller, Post, UseGuards } from '@nestjs/common';
import {
  AtJwtGuard,
  CustomAmqpConnection,
} from '@taskfusion-microservices/common';
import {
  CreateCheckoutSessionContract,
} from '@taskfusion-microservices/contracts';

@Controller('payments')
export class PaymentsController {
  constructor(private readonly customAmqpConnection: CustomAmqpConnection) {}

  @UseGuards(AtJwtGuard)
  @Post('create-checkout-session')
  async createCheckoutSession(
    @Body() dto: CreateCheckoutSessionContract.Request
  ): Promise<CreateCheckoutSessionContract.Response> {
    return this.customAmqpConnection.requestOrThrow<CreateCheckoutSessionContract.Response>(
      CreateCheckoutSessionContract.routingKey,
      dto
    );
  }
}
