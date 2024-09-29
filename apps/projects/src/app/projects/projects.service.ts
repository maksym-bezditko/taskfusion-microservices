import { defaultNackErrorHandler, RabbitRPC } from '@golevelup/nestjs-rabbitmq';
import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import {
  BaseService,
  CustomAmqpConnection,
} from '@taskfusion-microservices/common';
import {
  CreateProjectContract,
  GetClientProjectsContract,
  GetPmProjectsContract,
  GetDeveloperProjectsContract,
  GetProjectByIdContract,
  CheckProjectContract,
  GetProjectPmUserContract,
  GetProjectDeveloperUsersContract,
  GetProjectPmUserIdContract,
  GetUserProjectIdsContract,
  GetProjectDeveloperIdsContract,
  GetUserByIdContract,
  GetUsersByIdsContract,
  GetClientByUserIdContract,
  CheckUserContract,
} from '@taskfusion-microservices/contracts';
import { ProjectEntity } from '@taskfusion-microservices/entities';
import { Repository, In, DeepPartial } from 'typeorm';

@Injectable()
export class ProjectsService extends BaseService {
  constructor(
    @InjectRepository(ProjectEntity)
    private readonly projectRepository: Repository<ProjectEntity>,
    private readonly customAmqpConnection: CustomAmqpConnection
  ) {
    super(ProjectsService.name);
  }

  @RabbitRPC({
    exchange: CreateProjectContract.exchange,
    routingKey: CreateProjectContract.routingKey,
    queue: CreateProjectContract.queue,
    errorHandler: defaultNackErrorHandler,
  })
  async createProjectRpcHandler(
    dto: CreateProjectContract.Dto
  ): Promise<CreateProjectContract.Response> {
    await this.throwErrorIfUserDoesNotExist(dto.clientUserId);

    const project = await this.createProject(dto);

    this.logger.log('Created project');

    return { id: project.id };
  }

  private async throwErrorIfUserDoesNotExist(userId: number) {
    const dto: CheckUserContract.Dto = {
      userId,
    };

    const userResult =
      await this.customAmqpConnection.requestOrThrow<CheckUserContract.Response>(
        CheckUserContract.routingKey,
        dto
      );

    if (!userResult || !userResult.exists) {
      throw new NotFoundException('User not found!');
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
    errorHandler: defaultNackErrorHandler,
  })
  async getClientProjectsRpcHandler(
    dto: GetClientProjectsContract.Dto
  ): Promise<GetClientProjectsContract.Response> {
    const client = await this.getClientByUserId(dto.clientUserId);

    this.logger.log(`Retrieving client projects: ${dto.clientUserId}`);

    return this.getClientProjectsWithPmAndDeveloperUsers(client.id);
  }

  private async getClientProjectsWithPmAndDeveloperUsers(clientUserId: number) {
    const projects = await this.getClientProjects(clientUserId);

    // todo: fix n + 1 query
    const projectsWithUsers = projects.map(async (project) => {
      const developerUsers = await this.getProjectDeveloperUsers(project.id);
      const pmUser = await this.getProjectPmUser(project.id);

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

  private async getProjectPmUser(projectId: number) {
    await this.getProjectByIdOrThrow(projectId);

    const pmUserId = await this.getProjectPmId(projectId);

    if (!pmUserId) {
      return null;
    }

    const user = await this.getUserByIdOrThrow(pmUserId);

    return user;
  }

  async getProjectByIdOrThrow(projectId: number) {
    const project = await this.getProjectById(projectId);

    if (!project) {
      throw new NotFoundException('Project not found!');
    }

    return project;
  }

  async getProjectById(projectId: number) {
    return this.projectRepository.findOne({ where: { id: projectId } });
  }

  private async getProjectPmId(projectId: number) {
    const dto: GetProjectPmUserIdContract.Dto = {
      projectId,
    };

    const { pmUserId } =
      await this.customAmqpConnection.requestOrThrow<GetProjectPmUserIdContract.Response>(
        GetProjectPmUserIdContract.routingKey,
        dto
      );

    return pmUserId;
  }

  private async getClientProjects(clientUserId: number) {
    const projects = await this.projectRepository.find({
      where: { clientUserId },
    });

    return projects;
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

  private async getUserByIdOrThrow(userId: number) {
    const user = await this.getUserById(userId);

    if (!user) {
      throw new NotFoundException('User not found');
    }

    return user;
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

    return user;
  }

  @RabbitRPC({
    exchange: GetPmProjectsContract.exchange,
    routingKey: GetPmProjectsContract.routingKey,
    queue: GetPmProjectsContract.queue,
    errorHandler: defaultNackErrorHandler,
  })
  async getPmProjectsRpcHandler(
    dto: GetPmProjectsContract.Dto
  ): Promise<GetPmProjectsContract.Response> {
    const pmProjects = await this.getPmProjects(dto.pmUserId);

    this.logger.log(`Retrieving PM projects: ${dto.pmUserId}`);

    return pmProjects;
  }

  private async getPmProjects(pmUserId: number) {
    const projectIds = await this.getUserProjectIds(pmUserId);
    const projects = await this.getProjectsByProjectIds(projectIds);

    // todo: fix n + 1 query
    const projectsWithDeveloperUsers = projects.map(async (project) => {
      const developerUsers = await this.getProjectDeveloperUsers(project.id);

      return {
        ...project,
        developerUsers: developerUsers || [],
      };
    });

    return Promise.all(projectsWithDeveloperUsers);
  }

  private async getUserProjectIds(userId: number) {
    const dto: GetUserProjectIdsContract.Dto = {
      userId,
    };

    const projectIds =
      await this.customAmqpConnection.requestOrThrow<GetUserProjectIdsContract.Response>(
        GetUserProjectIdsContract.routingKey,
        dto
      );

    return projectIds;
  }

  private async getProjectsByProjectIds(projectIds: number[]) {
    const projects = await this.projectRepository.find({
      where: { id: In(projectIds) },
    });

    return projects;
  }

  private async getProjectDeveloperUsers(projectId: number) {
    await this.getProjectByIdOrThrow(projectId);

    const developerUserIds = await this.getProjectDeveloperIds(projectId);

    if (!developerUserIds.length) {
      return [];
    }

    const users = await this.getUsersByIds(developerUserIds);

    return users;
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

  private async getUsersByIds(userIds: number[]) {
    const dto: GetUsersByIdsContract.Dto = {
      ids: userIds,
    };

    const users =
      await this.customAmqpConnection.requestOrThrow<GetUsersByIdsContract.Response>(
        GetUsersByIdsContract.routingKey,
        dto
      );

    return users;
  }

  @RabbitRPC({
    exchange: GetDeveloperProjectsContract.exchange,
    routingKey: GetDeveloperProjectsContract.routingKey,
    queue: GetDeveloperProjectsContract.queue,
    errorHandler: defaultNackErrorHandler,
  })
  async getDeveloperProjectsRpcHandler(
    dto: GetDeveloperProjectsContract.Dto
  ): Promise<GetDeveloperProjectsContract.Response> {
    const developerProjectsWithPmUser =
      await this.getDeveloperProjectsWithPmUser(dto.developerUserId);

    this.logger.log(`Retrieving developer projects: ${dto.developerUserId}`);

    return developerProjectsWithPmUser;
  }

  private async getDeveloperProjectsWithPmUser(developerUserId: number) {
    const projectIds = await this.getUserProjectIds(developerUserId);
    const projects = await this.getProjectsByProjectIds(projectIds);

    // todo: fix n + 1 query

    const projectsWithPmUser = projects.map(async (project) => {
      const pmUser = await this.getProjectPmUser(project.id);

      return {
        ...project,
        pmUser,
      };
    });

    return Promise.all(projectsWithPmUser);
  }

  @RabbitRPC({
    exchange: GetProjectByIdContract.exchange,
    routingKey: GetProjectByIdContract.routingKey,
    queue: GetProjectByIdContract.queue,
    errorHandler: defaultNackErrorHandler,
  })
  async getProjectByIdRpcHandler(
    dto: GetProjectByIdContract.Dto
  ): Promise<GetProjectByIdContract.Response> {
    const project = await this.getProjectById(dto.projectId);

    this.logger.log(`Retrieving project: ${dto.projectId}`);

    return project;
  }

  @RabbitRPC({
    exchange: CheckProjectContract.exchange,
    routingKey: CheckProjectContract.routingKey,
    queue: CheckProjectContract.queue,
    errorHandler: defaultNackErrorHandler,
  })
  async checkProjectRpcHandler(
    dto: CheckProjectContract.Dto
  ): Promise<CheckProjectContract.Response> {
    const project = await this.checkProject(dto.projectId);

    this.logger.log(`Checking if project exists: ${dto.projectId}`);

    return project;
  }

  private async checkProject(projectId: number) {
    const project = await this.getProjectById(projectId);

    return {
      exists: Boolean(project),
    };
  }

  @RabbitRPC({
    exchange: GetProjectPmUserContract.exchange,
    routingKey: GetProjectPmUserContract.routingKey,
    queue: GetProjectPmUserContract.queue,
    errorHandler: defaultNackErrorHandler,
  })
  async getProjectPmUserRpcHandler(
    dto: GetProjectPmUserContract.Dto
  ): Promise<GetProjectPmUserContract.Response> {
    const pmUser = await this.getProjectPmUser(dto.projectId);

    this.logger.log(`Retrieving project pm user: ${dto.projectId}`);

    return pmUser;
  }

  @RabbitRPC({
    exchange: GetProjectDeveloperUsersContract.exchange,
    routingKey: GetProjectDeveloperUsersContract.routingKey,
    queue: GetProjectDeveloperUsersContract.queue,
    errorHandler: defaultNackErrorHandler,
  })
  async getProjectDeveloperUsersRpcHandler(
    dto: GetProjectDeveloperUsersContract.Dto
  ): Promise<GetProjectDeveloperUsersContract.Response> {
    const projectDeveloperUsers = await this.getProjectDeveloperUsers(
      dto.projectId
    );

    this.logger.log(`Retrieving project developer users: ${dto.projectId}`);

    return projectDeveloperUsers;
  }
}
