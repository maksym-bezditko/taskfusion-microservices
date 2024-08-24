import {
  AmqpConnection,
  defaultNackErrorHandler,
  MessageHandlerErrorBehavior,
  RabbitRPC,
} from '@golevelup/nestjs-rabbitmq';
import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import {
  AssignUserToProjectContract,
  GetProjectPmIdContract,
  UnassignUserFromProjectContract,
} from '@taskfusion-microservices/contracts';
import {
  ProjectParticipantRole,
  ProjectsUsersEntity,
} from '@taskfusion-microservices/entities';
import { Repository } from 'typeorm';

@Injectable()
export class AppService {
  constructor(
    @InjectRepository(ProjectsUsersEntity)
    private readonly tasksUsersRepository: Repository<ProjectsUsersEntity>,
    private readonly amqpConnection: AmqpConnection
  ) {}

  @RabbitRPC({
    exchange: GetProjectPmIdContract.exchange,
    routingKey: GetProjectPmIdContract.routingKey,
    queue: GetProjectPmIdContract.queue,
    errorBehavior: MessageHandlerErrorBehavior.NACK,
    errorHandler: defaultNackErrorHandler,
    allowNonJsonMessages: true,
    name: 'get-project-pm-id',
  })
  async getProjectPmId(
    dto: GetProjectPmIdContract.Dto
  ): Promise<GetProjectPmIdContract.Response> {
    const { projectId } = dto;

    const entry = await this.tasksUsersRepository.findOne({
      where: {
        projectId,
        role: ProjectParticipantRole.PM,
      },
    });

    if (!entry) {
      return {
        pmUserId: null,
      };
    }

    return {
      pmUserId: entry.userId,
    };
  }

  @RabbitRPC({
    exchange: AssignUserToProjectContract.exchange,
    routingKey: AssignUserToProjectContract.routingKey,
    queue: AssignUserToProjectContract.queue,
    errorBehavior: MessageHandlerErrorBehavior.NACK,
    errorHandler: defaultNackErrorHandler,
    allowNonJsonMessages: true,
    name: 'assign-user-to-project',
  })
  async assignUserToProject(
    dto: AssignUserToProjectContract.Dto
  ): Promise<AssignUserToProjectContract.Response> {
    const { projectId, userId, role } = dto;

    const entry = await this.tasksUsersRepository.findOne({
      where: {
        projectId,
        userId,
        role
      },
    });

    if (entry) {
      return {
        success: false,
      };
    }

    const entity = this.tasksUsersRepository.create({
      projectId,
      userId,
      role
    });

    await this.tasksUsersRepository.save(entity);

    return {
      success: true,
    }
  }

  @RabbitRPC({
    exchange: UnassignUserFromProjectContract.exchange,
    routingKey: UnassignUserFromProjectContract.routingKey,
    queue: UnassignUserFromProjectContract.queue,
    errorBehavior: MessageHandlerErrorBehavior.NACK,
    errorHandler: defaultNackErrorHandler,
    allowNonJsonMessages: true,
    name: 'unassign-user-from-project',
  })
  async unassignUserFromProject(
    dto: UnassignUserFromProjectContract.Dto
  ): Promise<UnassignUserFromProjectContract.Response> {
    const { projectId, userId, role } = dto;

    const entry = await this.tasksUsersRepository.findOne({
      where: {
        projectId,
        userId,
        role
      },
    });

    if (!entry) {
      return {
        success: false,
      };
    }

    const result = await this.tasksUsersRepository.delete({
      projectId,
      userId,
      role
    });

    return {
      success: result.affected > 0,
    }
  }
}
