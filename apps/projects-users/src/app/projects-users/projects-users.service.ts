import {
  defaultNackErrorHandler,
  MessageHandlerErrorBehavior,
  RabbitRPC,
} from '@golevelup/nestjs-rabbitmq';
import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { BaseService } from '@taskfusion-microservices/common';
import {
  AssignUserToProjectContract,
  GetProjectDeveloperIdsContract,
  GetProjectPmIdContract,
  GetUserProjectIdsContract,
  UnassignUserFromProjectContract,
} from '@taskfusion-microservices/contracts';
import {
  ProjectParticipantRole,
  ProjectsUsersEntity,
} from '@taskfusion-microservices/entities';
import { Repository } from 'typeorm';

@Injectable()
export class ProjectsUsersService extends BaseService {
  constructor(
    @InjectRepository(ProjectsUsersEntity)
    private readonly projectsUsersRepository: Repository<ProjectsUsersEntity>
  ) {
    super(ProjectsUsersService.name);
  }

  @RabbitRPC({
    exchange: GetUserProjectIdsContract.exchange,
    routingKey: GetUserProjectIdsContract.routingKey,
    queue: GetUserProjectIdsContract.queue,
    errorBehavior: MessageHandlerErrorBehavior.NACK,
    errorHandler: defaultNackErrorHandler,
    allowNonJsonMessages: true,
    name: 'get-user-project-ids',
  })
  async getUserProjectIds(
    dto: GetUserProjectIdsContract.Dto
  ): Promise<GetUserProjectIdsContract.Response> {
    const { userId } = dto;

    const entries = await this.projectsUsersRepository.find({
      where: {
        userId,
      },
    });

    this.logger.log('Retrieving user project ids');

    return entries.map((entry) => entry.projectId);
  }

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

    const entry = await this.projectsUsersRepository.findOne({
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

    this.logger.log('Retrieving project pm id');

    return {
      pmUserId: entry.userId,
    };
  }

  @RabbitRPC({
    exchange: GetProjectDeveloperIdsContract.exchange,
    routingKey: GetProjectDeveloperIdsContract.routingKey,
    queue: GetProjectDeveloperIdsContract.queue,
    errorBehavior: MessageHandlerErrorBehavior.NACK,
    errorHandler: defaultNackErrorHandler,
    allowNonJsonMessages: true,
    name: 'get-project-developer-ids',
  })
  async getProjectDeveloperIds(
    dto: GetProjectDeveloperIdsContract.Dto
  ): Promise<GetProjectDeveloperIdsContract.Response> {
    const { projectId } = dto;

    const entry = await this.projectsUsersRepository.find({
      where: {
        projectId,
        role: ProjectParticipantRole.DEVELOPER,
      },
    });

    this.logger.log('Retrieving project developer ids');

    return {
      developerUserIds: entry.map((entry) => entry.userId),
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

    const entry = await this.projectsUsersRepository.findOne({
      where: {
        projectId,
        userId,
        role,
      },
    });

    if (entry) {
      return {
        success: false,
      };
    }

    const entity = this.projectsUsersRepository.create({
      projectId,
      userId,
      role,
    });

    await this.projectsUsersRepository.save(entity);

    this.logger.log('Assigning user to project');

    return {
      success: true,
    };
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

    const entry = await this.projectsUsersRepository.findOne({
      where: {
        projectId,
        userId,
        role,
      },
    });

    if (!entry) {
      return {
        success: false,
      };
    }

    const result = await this.projectsUsersRepository.delete({
      projectId,
      userId,
      role,
    });

    this.logger.log('Unassigning user from project');

    return {
      success: result.affected > 0,
    };
  }
}
