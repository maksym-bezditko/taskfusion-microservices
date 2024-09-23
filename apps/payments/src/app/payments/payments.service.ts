import { RabbitRPC } from '@golevelup/nestjs-rabbitmq';
import { InjectStripeClient } from '@golevelup/nestjs-stripe';
import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import {
  BaseService,
  CustomAmqpConnection,
} from '@taskfusion-microservices/common';
import {
  AcceptPaymentRequestContract,
  CheckUserContract,
  CreateCheckoutSessionContract,
  CreatePaymentRequestContract,
  GetProjectByIdContract,
  RejectPaymentRequestContract,
} from '@taskfusion-microservices/contracts';
import {
  PaymentRequestEntity,
  PaymentRequestStatus,
} from '@taskfusion-microservices/entities';
import Stripe from 'stripe';
import { DeepPartial, Repository } from 'typeorm';

@Injectable()
export class PaymentsService extends BaseService {
  constructor(
    @InjectStripeClient() private readonly stripeClient: Stripe,
    @InjectRepository(PaymentRequestEntity)
    private readonly paymentRequestRepository: Repository<PaymentRequestEntity>,
    private readonly customAmqpConnection: CustomAmqpConnection
  ) {
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

  @RabbitRPC({
    exchange: CreatePaymentRequestContract.exchange,
    routingKey: CreatePaymentRequestContract.routingKey,
    queue: CreatePaymentRequestContract.queue,
  })
  async createPaymentRequestRpcHandler(dto: CreatePaymentRequestContract.Dto) {
    this.logger.log(`Payment request created`, dto);

    return this.createPaymentRequest(dto);
  }

  private async createPaymentRequest(dto: CreatePaymentRequestContract.Dto) {
    const {
      clientUserId,
      comment,
      usdAmount,
      projectId,
      paymentPeriodStartDate,
      paymentPeriodEndDate,
    } = dto;

    await this.throwIfUserDoesNotExist(clientUserId);
    await this.throwIfProjectDoesNotExist(projectId);

    const paymentRequest = this.paymentRequestRepository.create({
      clientUserId,
      comment,
      usdAmount,
      projectId,
      paymentPeriodStartDate,
      paymentPeriodEndDate,
      status: PaymentRequestStatus.PENDING,
    });

    await this.paymentRequestRepository.save(paymentRequest);

    return paymentRequest;
  }

  private async throwIfUserDoesNotExist(userId: number) {
    const payload: CheckUserContract.Dto = {
      userId,
    };

    const user =
      await this.customAmqpConnection.requestOrThrow<CheckUserContract.Response>(
        CheckUserContract.routingKey,
        payload
      );

    if (!user || !user.exists) {
      this.logAndThrowError(new NotFoundException('User not found'));
    }

    return user;
  }

  private async throwIfProjectDoesNotExist(projectId: number) {
    const payload: GetProjectByIdContract.Dto = {
      projectId,
    };

    const project =
      await this.customAmqpConnection.requestOrThrow<GetProjectByIdContract.Response>(
        GetProjectByIdContract.routingKey,
        payload
      );

    if (!project || !project.id) {
      this.logAndThrowError(new NotFoundException('Project not found'));
    }

    return project;
  }

  @RabbitRPC({
    exchange: AcceptPaymentRequestContract.exchange,
    routingKey: AcceptPaymentRequestContract.routingKey,
    queue: AcceptPaymentRequestContract.queue,
  })
  async acceptPaymentRequestRpcHandler(dto: AcceptPaymentRequestContract.Dto) {
    this.logger.log(`Payment request accepted`, dto);

    return this.approvePaymentRequest(dto);
  }

  private async approvePaymentRequest(
    paymentRequest: AcceptPaymentRequestContract.Dto
  ) {
    const { paymentRequestId } = paymentRequest;

    const paymentRequestEntity = await this.getPaymentRequestByIdOrThrow(
      paymentRequestId
    );

    await this.throwIfPaymentRequestIsAcceptedOrRejected(paymentRequestEntity);

    const result = await this.updatePaymentRequestById(paymentRequestId, {
      status: PaymentRequestStatus.APPROVED,
    });

    return {
      success: result.affected === 1,
    };
  }

  private async getPaymentRequestByIdOrThrow(paymentRequestId: number) {
    const paymentRequest = await this.getPaymentRequestById(paymentRequestId);

    if (!paymentRequest) {
      this.logAndThrowError(new NotFoundException('Payment request not found'));
    }

    return paymentRequest;
  }

  private async getPaymentRequestById(paymentRequestId: number) {
    const paymentRequest = await this.paymentRequestRepository.findOne({
      where: { id: paymentRequestId },
    });

    return paymentRequest;
  }

  private async throwIfPaymentRequestIsAcceptedOrRejected(
    paymentRequest: PaymentRequestEntity
  ) {
    if (paymentRequest.status === PaymentRequestStatus.APPROVED) {
      this.logAndThrowError(
        new BadRequestException('Payment request is already approved')
      );
    }

    if (paymentRequest.status === PaymentRequestStatus.REJECTED) {
      this.logAndThrowError(
        new BadRequestException('Payment request is already rejected')
      );
    }
  }

  private updatePaymentRequestById(
    id: number,
    updatedFields: DeepPartial<PaymentRequestEntity>
  ) {
    return this.paymentRequestRepository.update({ id }, updatedFields);
  }

  @RabbitRPC({
    exchange: RejectPaymentRequestContract.exchange,
    routingKey: RejectPaymentRequestContract.routingKey,
    queue: RejectPaymentRequestContract.queue,
  })
  async rejectPaymentRequestRpcHandler(dto: RejectPaymentRequestContract.Dto) {
    this.logger.log(`Payment request rejected`, dto);

    return this.rejectPaymentRequest(dto);
  }

  private async rejectPaymentRequest(
    paymentRequest: RejectPaymentRequestContract.Dto
  ) {
    const { paymentRequestId } = paymentRequest;

    const paymentRequestEntity = await this.getPaymentRequestByIdOrThrow(
      paymentRequestId
    );

    await this.throwIfPaymentRequestIsAcceptedOrRejected(paymentRequestEntity);

    const result = await this.updatePaymentRequestById(paymentRequestId, {
      status: PaymentRequestStatus.REJECTED,
    });

    return {
      success: result.affected === 1,
    };
  }
}
