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
  CheckProjectContract,
  CreateProjectContract,
  GetClientByUserIdContract,
  GetProjectByIdContract,
  GetProjectPmIdContract,
  GetProjectPmUserContract,
  GetProjectsContract,
  GetUsersByIdsContract,
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
          clientId: dto.clientId,
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

    if (dto.pmId) {
      const pm = await this.amqpConnection.request<CheckPmContract.Response>({
        exchange: CheckPmContract.exchange,
        routingKey: CheckPmContract.routingKey,
        payload: {
          pmId: dto.pmId,
        } as CheckPmContract.Request,
      });

      await handleRpcRequest<CheckClientContract.Response>(
        pm,
        async (response) => {
          if (!response.exists) {
            throw new NotFoundException('Pm not found!');
          }
        }
      );
    }

    const project = this.projectRepository.create({
      clientId: dto.clientId,
      pmId: dto.pmId,
      description: dto.description,
      title: dto.title,
      deadline: new Date(dto.deadline),
    });

    await this.projectRepository.save(project);

    return {
      id: project.id,
    };
  }

  @RabbitRPC({
    exchange: GetProjectsContract.exchange,
    routingKey: GetProjectsContract.routingKey,
    queue: GetProjectsContract.queue,
    errorBehavior: MessageHandlerErrorBehavior.NACK,
    errorHandler: defaultNackErrorHandler,
    allowNonJsonMessages: true,
    name: 'get-projects',
  })
  async getProjects(
    dto: GetProjectsContract.Dto
  ): Promise<GetProjectsContract.Response> {
    const clientResult =
      await this.amqpConnection.request<GetClientByUserIdContract.Response>({
        exchange: GetClientByUserIdContract.exchange,
        routingKey: GetClientByUserIdContract.routingKey,
        payload: {
          userId: dto.userId,
        } as GetClientByUserIdContract.Dto,
      });

    const clientId = await handleRpcRequest(clientResult, async (response) => {
      if (!response.id) {
        throw new NotFoundException('Client not found!');
      }

      return response.id;
    });

    const projects = await this.projectRepository.find({
      where: {
        clientId,
      },
    });

    return projects;
  }

  @RabbitRPC({
    exchange: GetProjectByIdContract.exchange,
    routingKey: GetProjectByIdContract.routingKey,
    queue: GetProjectByIdContract.queue,
    errorBehavior: MessageHandlerErrorBehavior.NACK,
    errorHandler: defaultNackErrorHandler,
    allowNonJsonMessages: true,
    name: 'get-project-by-id',
  })
  async getProjectById(
    dto: GetProjectByIdContract.Dto
  ): Promise<GetProjectByIdContract.Response> {
    const project = await this.projectRepository.findOne({
      where: {
        id: dto.projectId,
      },
    });

    return project;
  }

  @RabbitRPC({
    exchange: CheckProjectContract.exchange,
    routingKey: CheckProjectContract.routingKey,
    queue: CheckProjectContract.queue,
    errorBehavior: MessageHandlerErrorBehavior.NACK,
    errorHandler: defaultNackErrorHandler,
    allowNonJsonMessages: true,
    name: 'check-project',
  })
  async checkProject(
    dto: CheckProjectContract.Request
  ): Promise<CheckProjectContract.Response> {
    const project = await this.projectRepository.findOne({
      where: {
        id: dto.projectId,
      },
    });

    return {
      exists: Boolean(project),
    };
  }

  @RabbitRPC({
    exchange: GetProjectPmUserContract.exchange,
    routingKey: GetProjectPmUserContract.routingKey,
    queue: GetProjectPmUserContract.queue,
    errorBehavior: MessageHandlerErrorBehavior.NACK,
    errorHandler: defaultNackErrorHandler,
    allowNonJsonMessages: true,
    name: 'get-project-pm-user',
  })
  async getProjectPmUser(
    dto: GetProjectPmUserContract.Request
  ): Promise<GetProjectPmUserContract.Response> {
    const { projectId } = dto;

    const project = await this.projectRepository.findOne({
      where: {
        id: projectId,
      },
    });

    if (!project) {
      throw new NotFoundException('Project not found!');
    }

    const result =
      await this.amqpConnection.request<GetProjectPmIdContract.Response>({
        exchange: GetProjectPmIdContract.exchange,
        routingKey: GetProjectPmIdContract.routingKey,
        payload: {
          projectId,
        } as GetProjectPmIdContract.Dto,
      });

    const { pmUserId } = await handleRpcRequest(
      result,
      async (response) => response
    );

    if (!pmUserId) {
      throw new NotFoundException('Project pm not found!');
    }

    const usersResult =
      await this.amqpConnection.request<GetUsersByIdsContract.Response>({
        exchange: GetUsersByIdsContract.exchange,
        routingKey: GetUsersByIdsContract.routingKey,
        payload: {
          ids: [pmUserId],
        } as GetUsersByIdsContract.Request,
      });

    const users = await handleRpcRequest(
      usersResult,
      async (response) => response
    );

    if (!users[0]) {
      throw new NotFoundException('Project pm not found!');
    }

    return users[0];
  }
}
