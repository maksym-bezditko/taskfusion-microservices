import { Body, Controller, Get, Param, Post, UseGuards } from '@nestjs/common';
import {
  AtJwtGuard,
  ClientGuard,
  CustomAmqpConnection,
  PmGuard,
} from '@taskfusion-microservices/common';
import {
  CreateCheckoutSessionContract,
  CreatePaymentRequestContract,
  GetClientPaymentRequestsContract,
  GetPaymentRequestByIdContract,
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
  @Post('reject-payment-request')
  async rejectPaymentRequest(
    @Body() dto: RejectPaymentRequestContract.Request
  ): Promise<RejectPaymentRequestContract.Response> {
    return this.customAmqpConnection.requestOrThrow<RejectPaymentRequestContract.Response>(
      RejectPaymentRequestContract.routingKey,
      dto
    );
  }

  @UseGuards(AtJwtGuard, ClientGuard)
  @Get('get-client-payment-requests')
  async getClientPaymentRequests(
    @Body() dto: GetClientPaymentRequestsContract.Request
  ): Promise<GetClientPaymentRequestsContract.Response> {
    return this.customAmqpConnection.requestOrThrow<GetClientPaymentRequestsContract.Response>(
      GetClientPaymentRequestsContract.routingKey,
      dto
    );
  }

  @UseGuards(AtJwtGuard, ClientGuard)
  @Get('get-payment-request-by-id/:paymentRequestId')
  async getPaymentRequestById(
    @Param('paymentRequestId') paymentRequestId: number
  ): Promise<GetPaymentRequestByIdContract.Response> {
    return this.customAmqpConnection.requestOrThrow<GetPaymentRequestByIdContract.Response>(
      GetPaymentRequestByIdContract.routingKey,
      {
        paymentRequestId,
      }
    );
  }
}
