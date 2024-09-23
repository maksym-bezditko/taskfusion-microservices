import { Body, Controller, Post, UseGuards } from '@nestjs/common';
import {
  AtJwtGuard,
  ClientGuard,
  CustomAmqpConnection,
  PmGuard,
} from '@taskfusion-microservices/common';
import {
  AcceptPaymentRequestContract,
  CreateCheckoutSessionContract,
  CreatePaymentRequestContract,
  RejectPaymentRequestContract,
} from '@taskfusion-microservices/contracts';

@Controller('payments')
export class PaymentsController {
  constructor(private readonly customAmqpConnection: CustomAmqpConnection) {}

  @UseGuards(AtJwtGuard, ClientGuard)
  @Post('create-checkout-session')
  async createCheckoutSession(
    @Body() dto: CreateCheckoutSessionContract.Request
  ): Promise<CreateCheckoutSessionContract.Response> {
    return this.customAmqpConnection.requestOrThrow<CreateCheckoutSessionContract.Response>(
      CreateCheckoutSessionContract.routingKey,
      dto
    );
  }

  @UseGuards(AtJwtGuard, PmGuard)
  @Post('create-payment-request')
  async createPaymentRequest(
    @Body() dto: CreatePaymentRequestContract.Request
  ): Promise<CreatePaymentRequestContract.Response> {
    return this.customAmqpConnection.requestOrThrow<CreatePaymentRequestContract.Response>(
      CreatePaymentRequestContract.routingKey,
      dto
    );
  }

  @UseGuards(AtJwtGuard, ClientGuard)
  @Post('accept-payment-request')
  async acceptPaymentRequest(
    @Body() dto: AcceptPaymentRequestContract.Request
  ): Promise<AcceptPaymentRequestContract.Response> {
    return this.customAmqpConnection.requestOrThrow<AcceptPaymentRequestContract.Response>(
      AcceptPaymentRequestContract.routingKey,
      dto
    );
  }

  @UseGuards(AtJwtGuard, ClientGuard)
  @Post('reject-payment-request')
  async rejectPaymentRequest(
    @Body() dto: RejectPaymentRequestContract.Request
  ): Promise<RejectPaymentRequestContract.Response> {
    return this.customAmqpConnection.requestOrThrow<RejectPaymentRequestContract.Response>(
      RejectPaymentRequestContract.routingKey,
      dto
    );
  }
}
