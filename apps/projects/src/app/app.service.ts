import {
  RabbitRPC,
  MessageHandlerErrorBehavior,
  defaultNackErrorHandler,
  AmqpConnection,
} from '@golevelup/nestjs-rabbitmq';
import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import {
  CheckClientContract,
  CheckPmContract,
  CreateProjectContract,
} from '@taskfusion-microservices/contracts';
import { ProjectEntity } from '@taskfusion-microservices/entities';
import { handleRpcRequest } from '@taskfusion-microservices/helpers';
import { Repository } from 'typeorm';

@Injectable()
export class AppService {
  constructor(
    @InjectRepository(ProjectEntity)
    private readonly projectRepository: Repository<ProjectEntity>,
    private readonly amqpConnection: AmqpConnection
  ) {}

  @RabbitRPC({
    exchange: CreateProjectContract.exchange,
    routingKey: CreateProjectContract.routingKey,
    queue: CreateProjectContract.queue,
    errorBehavior: MessageHandlerErrorBehavior.NACK,
    errorHandler: defaultNackErrorHandler,
    allowNonJsonMessages: true,
    name: 'create-project',
  })
  async createProject(
    dto: CreateProjectContract.Request
  ): Promise<CreateProjectContract.Response> {
    const clientResult =
      await this.amqpConnection.request<CheckClientContract.Response>({
        exchange: CheckClientContract.exchange,
        routingKey: CheckClientContract.routingKey,
        payload: {
          client_id: dto.client_id,
        } as CheckClientContract.Request,
      });

    await handleRpcRequest<CheckClientContract.Response>(
      clientResult,
      async (response) => {
        if (!response.exists) {
          throw new NotFoundException('Client not found!');
        }
      }
    );

    const pm = await this.amqpConnection.request<CheckPmContract.Response>({
      exchange: CheckPmContract.exchange,
      routingKey: CheckPmContract.routingKey,
      payload: {
        pm_id: dto.pm_id,
      } as CheckPmContract.Request,
    });

    await handleRpcRequest<CheckClientContract.Response>(pm, async (response) => {
      if (!response.exists) {
        throw new NotFoundException('Pm not found!');
      }
    });

    const project = this.projectRepository.create({
      client_id: dto.client_id,
      pm_id: dto.pm_id,
    });

    await this.projectRepository.save(project);

    return {
      id: project.id,
    };
  }
}
