import {
  AmqpConnection,
  RabbitRPC,
  MessageHandlerErrorBehavior,
  defaultNackErrorHandler,
} from '@golevelup/nestjs-rabbitmq';
import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
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
import { handleRpcRequest } from '@taskfusion-microservices/helpers';
import { Repository, In } from 'typeorm';

@Injectable()
export class ProjectsService {
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
    dto: CreateProjectContract.Dto
  ): Promise<CreateProjectContract.Response> {
    await this.checkClientExistence(dto.clientId);

    if (dto.pmId) {
      await this.checkPmExistence(dto.pmId);
    }

    const project = this.projectRepository.create({
      clientId: dto.clientId,
      pmId: dto.pmId,
      description: dto.description,
      title: dto.title,
      deadline: new Date(dto.deadline),
    });

    await this.projectRepository.save(project);

    return { id: project.id };
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
  async getClientProjects(
    dto: GetClientProjectsContract.Dto
  ): Promise<GetClientProjectsContract.Response> {
    const clientId = await this.getClientByUserId(dto.clientUserId);

    return this.findProjectsByClientId(clientId);
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
  async getPmProjects(
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
  async getDeveloperProjects(
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
  async getProjectById(
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
  async checkProject(
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
  async getProjectPmUser(
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
  async getProjectDeveloperUsers(
    dto: GetProjectDeveloperUsersContract.Dto
  ): Promise<GetProjectDeveloperUsersContract.Response> {
    return this.findProjectDeveloperUsers(dto.projectId);
  }

  private async checkClientExistence(clientId: number) {
    const clientResult =
      await this.amqpConnection.request<CheckClientContract.Response>({
        exchange: CheckClientContract.exchange,
        routingKey: CheckClientContract.routingKey,
        payload: { clientId } as CheckClientContract.Dto,
      });

    await handleRpcRequest<CheckClientContract.Response>(
      clientResult,
      async (response) => {
        if (!response.exists) {
          throw new NotFoundException('Client not found!');
        }
      }
    );
  }

  private async checkPmExistence(pmId: number) {
    const pmResult =
      await this.amqpConnection.request<CheckPmContract.Response>({
        exchange: CheckPmContract.exchange,
        routingKey: CheckPmContract.routingKey,
        payload: { pmId } as CheckPmContract.Dto,
      });

    await handleRpcRequest(pmResult, async (response) => {
      if (!response.exists) {
        throw new NotFoundException('PM not found!');
      }
    });
  }

  private async getProjectPmId(projectId: number) {
    const result =
      await this.amqpConnection.request<GetProjectPmIdContract.Response>({
        exchange: GetProjectPmIdContract.exchange,
        routingKey: GetProjectPmIdContract.routingKey,
        payload: { projectId } as GetProjectPmIdContract.Dto,
      });

    const { pmUserId } = await handleRpcRequest(
      result,
      async (response) => response
    );

    return pmUserId;
  }

  private async findProjectsByClientId(clientId: number) {
    const projects = await this.projectRepository.find({ where: { clientId } });

    const projectsWithUsers = projects.map(async (project) => {
      const developerUsers = await this.getProjectDeveloperUsers({
        projectId: project.id,
      });

      const pmUser = await this.getProjectPmUser({
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
    const result =
      await this.amqpConnection.request<GetUserProjectIdsContract.Response>({
        exchange: GetUserProjectIdsContract.exchange,
        routingKey: GetUserProjectIdsContract.routingKey,
        payload: { userId: pmUserId } as GetUserProjectIdsContract.Dto,
      });

    const projectIds = await handleRpcRequest(
      result,
      async (response) => response
    );

    const projects = await this.projectRepository.find({
      where: { id: In(projectIds) },
    });

    const projectsWithDeveloperUsers = projects.map(async (project) => {
      const developerUsers = await this.getProjectDeveloperUsers({
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
    const result =
      await this.amqpConnection.request<GetUserProjectIdsContract.Response>({
        exchange: GetUserProjectIdsContract.exchange,
        routingKey: GetUserProjectIdsContract.routingKey,
        payload: { userId: developerUserId } as GetUserProjectIdsContract.Dto,
      });

    const projectIds = await handleRpcRequest(
      result,
      async (response) => response
    );

    const projects = await this.projectRepository.find({
      where: { id: In(projectIds) },
    });

    const projectsWithPmUser = projects.map(async (project) => {
      const pmUser = await this.getProjectPmUser({
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
    const result =
      await this.amqpConnection.request<GetProjectDeveloperIdsContract.Response>(
        {
          exchange: GetProjectDeveloperIdsContract.exchange,
          routingKey: GetProjectDeveloperIdsContract.routingKey,
          payload: { projectId } as GetProjectDeveloperIdsContract.Dto,
        }
      );

    const { developerUserIds } = await handleRpcRequest(
      result,
      async (response) => response
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
    const userResult =
      await this.amqpConnection.request<GetUserByIdContract.Response>({
        exchange: GetUserByIdContract.exchange,
        routingKey: GetUserByIdContract.routingKey,
        payload: { id: userId } as GetUserByIdContract.Dto,
      });

    const user = await handleRpcRequest(
      userResult,
      async (response) => response
    );

    if (!user) {
      throw new NotFoundException('User not found!');
    }

    return user;
  }

  private async getUsersByIds(userIds: number[]) {
    const usersResult =
      await this.amqpConnection.request<GetUsersByIdsContract.Response>({
        exchange: GetUsersByIdsContract.exchange,
        routingKey: GetUsersByIdsContract.routingKey,
        payload: { ids: userIds } as GetUsersByIdsContract.Dto,
      });

    const users = await handleRpcRequest(
      usersResult,
      async (response) => response
    );

    if (!users) {
      throw new NotFoundException('Developer users not found');
    }

    return users;
  }

  private async getClientByUserId(clientUserId: number) {
    const clientResult =
      await this.amqpConnection.request<GetClientByUserIdContract.Response>({
        exchange: GetClientByUserIdContract.exchange,
        routingKey: GetClientByUserIdContract.routingKey,
        payload: { userId: clientUserId } as GetClientByUserIdContract.Dto,
      });

    const clientId = await handleRpcRequest(clientResult, async (response) => {
      if (!response.id) throw new NotFoundException('Client not found!');

      return response.id;
    });

    return clientId;
  }
}
