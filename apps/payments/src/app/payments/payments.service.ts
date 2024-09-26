import { defaultNackErrorHandler, RabbitRPC } from '@golevelup/nestjs-rabbitmq';
import {
  InjectStripeClient,
  StripeWebhookHandler,
} from '@golevelup/nestjs-stripe';
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
  CheckUserContract,
  CreateCheckoutSessionContract,
  CreatePaymentRequestContract,
  GetClientPaymentRequestsContract,
  GetPaymentRequestByIdContract,
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
    errorHandler: defaultNackErrorHandler,
  })
  async createCheckoutSessionRpcHandler(
    dto: CreateCheckoutSessionContract.Dto
  ) {
    this.logger.log(`Checkout session created`, dto);

    return this.createCheckoutSession(dto);
  }

  private async createCheckoutSession(dto: CreateCheckoutSessionContract.Dto) {
    const { projectId, usdAmount, paymentRequestId } = dto;

    const project = await this.getProjectByIdOrThrow(projectId);

    const session = await this.stripeClient.checkout.sessions.create({
      mode: 'payment',
      line_items: [
        {
          quantity: 1,
          price_data: {
            currency: 'usd',
            product_data: {
              name: `Payment requested for project "${project.title}"`,
            },
            unit_amount: usdAmount * 100,
          },
        },
      ],
      success_url: 'http://localhost:8000/dashboard',
      cancel_url: 'http://localhost:8000/dashboard',
    });

    await this.updatePaymentRequestCheckoutSessionId(
      paymentRequestId,
      session.id
    );

    return session;
  }

  private async updatePaymentRequestCheckoutSessionId(
    paymentRequestId: number,
    checkoutSessionId: string
  ) {
    const result = await this.paymentRequestRepository.update(
      paymentRequestId,
      {
        checkoutSessionId,
      }
    );

    return result.affected === 1;
  }

  private async acceptPaymentRequestByCheckoutSessionId(
    checkoutSessionId: string
  ) {
    const result = await this.updatePaymentRequestByCheckoutSessionId(
      checkoutSessionId,
      {
        status: PaymentRequestStatus.ACCEPTED,
      }
    );

    return result.affected === 1;
  }

  @RabbitRPC({
    exchange: CreatePaymentRequestContract.exchange,
    routingKey: CreatePaymentRequestContract.routingKey,
    queue: CreatePaymentRequestContract.queue,
    errorHandler: defaultNackErrorHandler,
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
    const project = await this.getProjectById(projectId);

    if (!project || !project.id) {
      this.logAndThrowError(new NotFoundException('Project not found'));
    }
  }

  private async getProjectByIdOrThrow(projectId: number) {
    const project = await this.getProjectById(projectId);

    if (!project) {
      this.logAndThrowError(new NotFoundException('Project not found'));
    }

    return project;
  }

  private async getProjectById(projectId: number) {
    const payload: GetProjectByIdContract.Dto = {
      projectId,
    };

    const project =
      await this.customAmqpConnection.requestOrThrow<GetProjectByIdContract.Response>(
        GetProjectByIdContract.routingKey,
        payload
      );

    return project;
  }

  @RabbitRPC({
    exchange: RejectPaymentRequestContract.exchange,
    routingKey: RejectPaymentRequestContract.routingKey,
    queue: RejectPaymentRequestContract.queue,
    errorHandler: defaultNackErrorHandler,
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
    if (paymentRequest.status === PaymentRequestStatus.ACCEPTED) {
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

  private updatePaymentRequestByCheckoutSessionId(
    checkoutSessionId: string,
    updatedFields: DeepPartial<PaymentRequestEntity>
  ) {
    return this.paymentRequestRepository.update(
      { checkoutSessionId },
      updatedFields
    );
  }

  @RabbitRPC({
    exchange: GetClientPaymentRequestsContract.exchange,
    routingKey: GetClientPaymentRequestsContract.routingKey,
    queue: GetClientPaymentRequestsContract.queue,
    errorHandler: defaultNackErrorHandler,
  })
  async getPaymentRequestsByClientIdRpcHandler(
    dto: GetClientPaymentRequestsContract.Dto
  ): Promise<GetClientPaymentRequestsContract.Response> {
    this.logger.log(`Payment requests retrieved`, dto);

    return this.getPaymentRequestsByClientIdWithProjects(dto.clientUserId);
  }

  private async getPaymentRequestsByClientIdWithProjects(clientUserId: number) {
    const paymentRequests = await this.getPaymentRequestsByClientId(
      clientUserId
    );

    // todo: fix n + 1 query

    const requestsWithProjects = paymentRequests.map(async (paymentRequest) => {
      const project = await this.getProjectById(paymentRequest.projectId);

      return {
        ...paymentRequest,
        project,
      };
    });

    return Promise.all(requestsWithProjects);
  }

  private async getPaymentRequestsByClientId(clientUserId: number) {
    await this.throwIfUserDoesNotExist(clientUserId);

    return this.paymentRequestRepository.find({
      where: {
        clientUserId,
      },
    });
  }

  @RabbitRPC({
    exchange: GetPaymentRequestByIdContract.exchange,
    routingKey: GetPaymentRequestByIdContract.routingKey,
    queue: GetPaymentRequestByIdContract.queue,
    errorHandler: defaultNackErrorHandler,
  })
  async getPaymentRequestByIdRpcHandler(
    dto: GetPaymentRequestByIdContract.Dto
  ): Promise<GetPaymentRequestByIdContract.Response> {
    this.logger.log(`Payment request retrieved`, dto);

    return this.getPaymentRequestByIdWithProject(dto.paymentRequestId);
  }

  private async getPaymentRequestByIdWithProject(
    paymentRequestId: number
  ): Promise<GetPaymentRequestByIdContract.Response> {
    const paymentRequest = await this.getPaymentRequestById(paymentRequestId);
    const project = await this.getProjectById(paymentRequest.projectId);

    return {
      paymentRequest: {
        ...paymentRequest,
        project,
      },
    };
  }

  @StripeWebhookHandler('checkout.session.completed')
  async handlePaymentIntentSucceeded(
    evt: Stripe.CheckoutSessionCompletedEvent
  ) {
    const checkoutSessionId = evt.data.object.id;

    console.log(checkoutSessionId);

    await this.acceptPaymentRequestByCheckoutSessionId(checkoutSessionId);
  }
}
