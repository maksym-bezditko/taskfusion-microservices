import {
  RabbitRPC,
  MessageHandlerErrorBehavior,
  defaultNackErrorHandler,
} from '@golevelup/nestjs-rabbitmq';
import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { CustomAmqpConnection } from '@taskfusion-microservices/common';
import {
  CreateProjectContract,
  GetClientProjectsContract,
  GetPmProjectsContract,
  GetDeveloperProjectsContract,
  GetProjectByIdContract,
  CheckProjectContract,
  GetProjectPmUserContract,
  GetProjectDeveloperUsersContract,
  CheckClientContract,
  CheckPmContract,
  GetProjectPmIdContract,
  GetUserProjectIdsContract,
  GetProjectDeveloperIdsContract,
  GetUserByIdContract,
  GetUsersByIdsContract,
  GetClientByUserIdContract,
} from '@taskfusion-microservices/contracts';
import { ProjectEntity } from '@taskfusion-microservices/entities';
import { Repository, In, DeepPartial } from 'typeorm';

@Injectable()
export class ProjectsService {
  constructor(
    @InjectRepository(ProjectEntity)
    private readonly projectRepository: Repository<ProjectEntity>,
    private readonly customAmqpConnection: CustomAmqpConnection
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
  async createProjectRpcHandler(
    dto: CreateProjectContract.Dto
  ): Promise<CreateProjectContract.Response> {
    await this.ensureClientExistsOrThrow(dto.clientId);

    const isPmDefined = dto.pmId;

    if (isPmDefined) {
      await this.ensurePmExistsOrThrow(dto.pmId);
    }

    const project = await this.createProject(dto);

    return { id: project.id };
  }

  private async ensurePmExistsOrThrow(pmId: number) {
    const dto = {
      pmId,
    };

    const pm =
      await this.customAmqpConnection.requestOrThrow<CheckPmContract.Response>(
        CheckPmContract.routingKey,
        dto
      );

    if (!pm || !pm.exists) {
      throw new NotFoundException('PM not found!');
    }
  }

  private async createProject(project: DeepPartial<ProjectEntity>) {
    const entry = this.projectRepository.create(project);

    return this.projectRepository.save(entry);
  }

  @RabbitRPC({
    exchange: GetClientProjectsContract.exchange,
    routingKey: GetClientProjectsContract.routingKey,
    queue: GetClientProjectsContract.queue,
    errorBehavior: MessageHandlerErrorBehavior.NACK,
    errorHandler: defaultNackErrorHandler,
    allowNonJsonMessages: true,
    name: 'get-client-projects',
  })
  async getClientProjectsRpcHandler(
    dto: GetClientProjectsContract.Dto
  ): Promise<GetClientProjectsContract.Response> {
    const client = await this.getClientByUserId(dto.clientUserId);

    return this.findProjectsByClientId(client.id);
  }

  @RabbitRPC({
    exchange: GetPmProjectsContract.exchange,
    routingKey: GetPmProjectsContract.routingKey,
    queue: GetPmProjectsContract.queue,
    errorBehavior: MessageHandlerErrorBehavior.NACK,
    errorHandler: defaultNackErrorHandler,
    allowNonJsonMessages: true,
    name: 'get-pm-projects',
  })
  async getPmProjectsRpcHandler(
    dto: GetPmProjectsContract.Dto
  ): Promise<GetPmProjectsContract.Response> {
    return this.findProjectsByPmId(dto.pmUserId);
  }

  @RabbitRPC({
    exchange: GetDeveloperProjectsContract.exchange,
    routingKey: GetDeveloperProjectsContract.routingKey,
    queue: GetDeveloperProjectsContract.queue,
    errorBehavior: MessageHandlerErrorBehavior.NACK,
    errorHandler: defaultNackErrorHandler,
    allowNonJsonMessages: true,
    name: 'get-developer-projects',
  })
  async getDeveloperProjectsRpcHandler(
    dto: GetDeveloperProjectsContract.Dto
  ): Promise<GetDeveloperProjectsContract.Response> {
    return this.findProjectsByDeveloperId(dto.developerUserId);
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
  async getProjectByIdRpcHandler(
    dto: GetProjectByIdContract.Dto
  ): Promise<GetProjectByIdContract.Response> {
    return this.ensureProjectById(dto.projectId);
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
  async checkProjectRpcHandler(
    dto: CheckProjectContract.Dto
  ): Promise<CheckProjectContract.Response> {
    const project = await this.projectRepository.findOne({
      where: { id: dto.projectId },
    });

    return { exists: Boolean(project) };
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
  async getProjectPmUserRpcHandler(
    dto: GetProjectPmUserContract.Dto
  ): Promise<GetProjectPmUserContract.Response> {
    return this.findProjectPmUser(dto.projectId);
  }

  @RabbitRPC({
    exchange: GetProjectDeveloperUsersContract.exchange,
    routingKey: GetProjectDeveloperUsersContract.routingKey,
    queue: GetProjectDeveloperUsersContract.queue,
    errorBehavior: MessageHandlerErrorBehavior.NACK,
    errorHandler: defaultNackErrorHandler,
    allowNonJsonMessages: true,
    name: 'get-project-developer-users',
  })
  async getProjectDeveloperUsersRpcHandler(
    dto: GetProjectDeveloperUsersContract.Dto
  ): Promise<GetProjectDeveloperUsersContract.Response> {
    return this.findProjectDeveloperUsers(dto.projectId);
  }

  private async ensureClientExistsOrThrow(clientId: number) {
    const dto: CheckClientContract.Dto = {
      clientId,
    };

    const clientResult =
      await this.customAmqpConnection.requestOrThrow<CheckClientContract.Response>(
        CheckClientContract.routingKey,
        dto
      );

    if (!clientResult || !clientResult.exists) {
      throw new NotFoundException('Client not found!');
    }
  }

  private async getProjectPmId(projectId: number) {
    const dto: GetProjectPmIdContract.Dto = {
      projectId,
    };

    const { pmUserId } =
      await this.customAmqpConnection.requestOrThrow<GetProjectPmIdContract.Response>(
        GetProjectPmIdContract.routingKey,
        dto
      );

    return pmUserId;
  }

  private async findProjectsByClientId(clientId: number) {
    const projects = await this.projectRepository.find({ where: { clientId } });

    const projectsWithUsers = projects.map(async (project) => {
      const developerUsers = await this.getProjectDeveloperUsersRpcHandler({
        projectId: project.id,
      });

      const pmUser = await this.getProjectPmUserRpcHandler({
        projectId: project.id,
      });

      const users = developerUsers;

      if (pmUser) {
        users.unshift(pmUser);
      }

      return {
        ...project,
        users,
      };
    });

    return Promise.all(projectsWithUsers);
  }

  private async findProjectsByPmId(pmUserId: number) {
    const dto: GetUserProjectIdsContract.Dto = {
      userId: pmUserId,
    };

    const projectIds =
      await this.customAmqpConnection.requestOrThrow<GetUserProjectIdsContract.Response>(
        GetUserProjectIdsContract.routingKey,
        dto
      );

    const projects = await this.projectRepository.find({
      where: { id: In(projectIds) },
    });

    const projectsWithDeveloperUsers = projects.map(async (project) => {
      const developerUsers = await this.getProjectDeveloperUsersRpcHandler({
        projectId: project.id,
      });

      return {
        ...project,
        developerUsers: developerUsers || [],
      };
    });

    return Promise.all(projectsWithDeveloperUsers);
  }

  private async findProjectsByDeveloperId(developerUserId: number) {
    const dto: GetUserProjectIdsContract.Dto = {
      userId: developerUserId,
    };

    const projectIds =
      await this.customAmqpConnection.requestOrThrow<GetUserProjectIdsContract.Response>(
        GetUserProjectIdsContract.routingKey,
        dto
      );

    const projects = await this.projectRepository.find({
      where: { id: In(projectIds) },
    });

    const projectsWithPmUser = projects.map(async (project) => {
      const pmUser = await this.getProjectPmUserRpcHandler({
        projectId: project.id,
      });

      return {
        ...project,
        pmUser,
      };
    });

    return Promise.all(projectsWithPmUser);
  }

  private async ensureProjectById(projectId: number) {
    const project = await this.projectRepository.findOne({
      where: { id: projectId },
    });

    if (!project) throw new NotFoundException('Project not found!');

    return project;
  }

  private async findProjectPmUser(projectId: number) {
    await this.ensureProjectById(projectId);

    const pmUserId = await this.getProjectPmId(projectId);

    if (!pmUserId) {
      return null;
    }

    const user = await this.getUserById(pmUserId);

    return user;
  }

  private async getProjectDeveloperIds(projectId: number) {
    const dto: GetProjectDeveloperIdsContract.Dto = {
      projectId,
    };

    const { developerUserIds } =
      await this.customAmqpConnection.requestOrThrow<GetProjectDeveloperIdsContract.Response>(
        GetProjectDeveloperIdsContract.routingKey,
        dto
      );

    return developerUserIds;
  }

  private async findProjectDeveloperUsers(projectId: number) {
    await this.ensureProjectById(projectId);

    const developerUserIds = await this.getProjectDeveloperIds(projectId);

    if (!developerUserIds.length) {
      return [];
    }

    const users = this.getUsersByIds(developerUserIds);

    return users;
  }

  private async getUserById(userId: number) {
    const dto: GetUserByIdContract.Dto = {
      id: userId,
    };

    const user =
      await this.customAmqpConnection.requestOrThrow<GetUserByIdContract.Response>(
        GetUserByIdContract.routingKey,
        dto
      );

    if (!user) {
      throw new NotFoundException('User not found!');
    }

    return user;
  }

  private async getUsersByIds(userIds: number[]) {
    const dto: GetUsersByIdsContract.Dto = {
      ids: userIds,
    };

    const users =
      await this.customAmqpConnection.requestOrThrow<GetUsersByIdsContract.Response>(
        GetUsersByIdsContract.routingKey,
        dto
      );

    if (!users) {
      throw new NotFoundException('Developer users not found');
    }

    return users;
  }

  private async getClientByUserId(clientUserId: number) {
    const dto: GetClientByUserIdContract.Dto = {
      userId: clientUserId,
    };

    const client =
      await this.customAmqpConnection.requestOrThrow<GetClientByUserIdContract.Response>(
        GetClientByUserIdContract.routingKey,
        dto
      );

    return client;
  }
}
