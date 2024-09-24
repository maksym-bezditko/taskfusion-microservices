import { defaultNackErrorHandler, RabbitRPC } from '@golevelup/nestjs-rabbitmq';
import { BadRequestException, Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { BaseService } from '@taskfusion-microservices/common';
import {
  AssignUserToProjectContract,
  GetProjectDeveloperIdsContract,
  GetProjectPmUserIdContract,
  GetUserProjectIdsContract,
  UnassignUserFromProjectContract,
} from '@taskfusion-microservices/contracts';
import {
  ProjectParticipantRole,
  ProjectsUsersEntity,
} from '@taskfusion-microservices/entities';
import { DeepPartial, FindOptionsWhere, Repository } from 'typeorm';

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
    errorHandler: defaultNackErrorHandler,
  })
  async getUserProjectIdsRpcHandler(
    dto: GetUserProjectIdsContract.Dto
  ): Promise<GetUserProjectIdsContract.Response> {
    this.logger.log('Retrieving user project ids');

    return this.getUserProjectIds(dto);
  }

  private async getUserProjectIds(dto: GetUserProjectIdsContract.Dto) {
    const entries = await this.projectsUsersRepository.find({
      where: {
        userId: dto.userId,
      },
    });

    return entries.map((entry) => entry.projectId);
  }

  @RabbitRPC({
    exchange: GetProjectPmUserIdContract.exchange,
    routingKey: GetProjectPmUserIdContract.routingKey,
    queue: GetProjectPmUserIdContract.queue,
    errorHandler: defaultNackErrorHandler,
  })
  async getProjectPmIdRpcHandler(
    dto: GetProjectPmUserIdContract.Dto
  ): Promise<GetProjectPmUserIdContract.Response> {
    this.logger.log('Retrieving project pm id');

    return this.getProjectPmUserId(dto);
  }

  private async getProjectPmUserId(dto: GetProjectPmUserIdContract.Dto) {
    const entry = await this.projectsUsersRepository.findOne({
      where: {
        projectId: dto.projectId,
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
    exchange: GetProjectDeveloperIdsContract.exchange,
    routingKey: GetProjectDeveloperIdsContract.routingKey,
    queue: GetProjectDeveloperIdsContract.queue,
    errorHandler: defaultNackErrorHandler,
  })
  async getProjectDeveloperIdsRpcHandler(
    dto: GetProjectDeveloperIdsContract.Dto
  ): Promise<GetProjectDeveloperIdsContract.Response> {
    this.logger.log('Retrieving project developer ids');

    return this.getProjectDeveloperIds(dto);
  }

  private async getProjectDeveloperIds(dto: GetProjectDeveloperIdsContract.Dto) {
    const entry = await this.projectsUsersRepository.find({
      where: {
        projectId: dto.projectId,
        role: ProjectParticipantRole.DEVELOPER,
      },
    });

    return {
      developerUserIds: entry.map((entry) => entry.userId),
    };
  }

  @RabbitRPC({
    exchange: AssignUserToProjectContract.exchange,
    routingKey: AssignUserToProjectContract.routingKey,
    queue: AssignUserToProjectContract.queue,
    errorHandler: defaultNackErrorHandler,
  })
  async assignUserToProjectRpcHandler(
    dto: AssignUserToProjectContract.Dto
  ): Promise<AssignUserToProjectContract.Response> {
    this.logger.log('Assigning user to project');

    return this.assignUserToProject(dto);
  }

  private async assignUserToProject(dto: AssignUserToProjectContract.Dto) {
    const { projectId, userId, role } = dto;

    await this.findProjectUserRelationAndThrowIfFound({
      projectId,
      userId,
      role,
    });

    await this.createProjectUserRelation({
      projectId,
      userId,
      role,
    });

    return {
      success: true,
    };
  }

  private async findProjectUserRelationAndThrowIfFound(
    where: FindOptionsWhere<ProjectsUsersEntity>
  ) {
    const entry = await this.findProjectUserRelation(where);

    if (entry) {
      this.logAndThrowError(
        new BadRequestException('User already assigned to project')
      );
    }

    return entry;
  }

  private async findProjectUserRelation(where: FindOptionsWhere<ProjectsUsersEntity>) {
    return this.projectsUsersRepository.findOne({
      where,
    });
  }

  private async createProjectUserRelation(data: DeepPartial<ProjectsUsersEntity>) {
    const entity = this.projectsUsersRepository.create(data);

    await this.projectsUsersRepository.save(entity);

    return entity;
  }

  @RabbitRPC({
    exchange: UnassignUserFromProjectContract.exchange,
    routingKey: UnassignUserFromProjectContract.routingKey,
    queue: UnassignUserFromProjectContract.queue,
    errorHandler: defaultNackErrorHandler,
  })
  async unassignUserFromProjectRpcHandler(
    dto: UnassignUserFromProjectContract.Dto
  ): Promise<UnassignUserFromProjectContract.Response> {
    this.logger.log('Unassigning user from project');

    return this.unassignUserFromProject(dto);
  }

  private async unassignUserFromProject(dto: UnassignUserFromProjectContract.Dto) {
    const { projectId, userId, role } = dto;

    await this.findProjectUserRelationAndThrowIfNotFound({
      projectId,
      userId,
      role,
    });

    const result = await this.deleteProjectUserRelation({
      projectId,
      userId,
      role,
    });

    return {
      success: result.affected > 0,
    };
  }

  private async findProjectUserRelationAndThrowIfNotFound(
    where: FindOptionsWhere<ProjectsUsersEntity>
  ) {
    const entry = await this.findProjectUserRelation(where);

    if (!entry) {
      this.logAndThrowError(
        new BadRequestException('User already assigned to project')
      );
    }

    return entry;
  }

  private async deleteProjectUserRelation(
    where: FindOptionsWhere<ProjectsUsersEntity>
  ) {
    return this.projectsUsersRepository.delete(where);
  }
}
