import { AmqpConnection } from '@golevelup/nestjs-rabbitmq';
import { Injectable } from '@nestjs/common';
import {
  AcceptPmInviteContract,
  CreateProjectContract,
  GetPmInviteByIdContract,
  GetProjectByIdContract,
  GetProjectPmUserContract,
  GetClientProjectsContract,
  InvitePmContract,
  RejectPmInviteContract,
  GetPmProjectsContract,
  InviteDeveloperContract,
  AcceptDeveloperInviteContract,
  RejectDeveloperInviteContract,
  GetDeveloperInviteByIdContract,
  GetProjectDeveloperUsersContract,
  GetDeveloperProjectsContract,
} from '@taskfusion-microservices/contracts';
import { handleRpcRequest } from '@taskfusion-microservices/helpers';

@Injectable()
export class ProjectsService {
  constructor(private readonly amqpConnection: AmqpConnection) {}

  async createProject(
    exchange: string,
    routingKey: string,
    dto: CreateProjectContract.Dto
  ): Promise<CreateProjectContract.Response> {
    const result =
      await this.amqpConnection.request<CreateProjectContract.Response>({
        exchange,
        routingKey,
        payload: dto,
      });

    return handleRpcRequest(result, async (response) => response);
  }

  async getClientProjects(
    exchange: string,
    routingKey: string,
    dto: GetClientProjectsContract.Dto
  ): Promise<GetClientProjectsContract.Response> {
    const result =
      await this.amqpConnection.request<GetClientProjectsContract.Response>({
        exchange,
        routingKey,
        payload: dto,
      });

    return handleRpcRequest(result, async (response) => response);
  }

  async getPmProjects(
    exchange: string,
    routingKey: string,
    dto: GetPmProjectsContract.Dto
  ): Promise<GetPmProjectsContract.Response> {
    const result =
      await this.amqpConnection.request<GetPmProjectsContract.Response>({
        exchange,
        routingKey,
        payload: dto,
      });

    return handleRpcRequest(result, async (response) => response);
  }

  async getDeveloperProjects(
    exchange: string,
    routingKey: string,
    dto: GetDeveloperProjectsContract.Dto
  ): Promise<GetDeveloperProjectsContract.Response> {
    const result =
      await this.amqpConnection.request<GetDeveloperProjectsContract.Response>({
        exchange,
        routingKey,
        payload: dto,
      });

    return handleRpcRequest(result, async (response) => response);
  }

  async getProjectById(
    exchange: string,
    routingKey: string,
    dto: GetProjectByIdContract.Dto
  ): Promise<GetProjectByIdContract.Response> {
    const result =
      await this.amqpConnection.request<GetProjectByIdContract.Response>({
        exchange,
        routingKey,
        payload: dto,
      });

    return handleRpcRequest(result, async (response) => response);
  }

  async invitePm(
    exchange: string,
    routingKey: string,
    dto: InvitePmContract.Dto
  ): Promise<InvitePmContract.Response> {
    const result = await this.amqpConnection.request<InvitePmContract.Response>(
      {
        exchange,
        routingKey,
        payload: dto,
      }
    );

    return handleRpcRequest(result, async (response) => response);
  }

  async acceptPmInvite(
    exchange: string,
    routingKey: string,
    dto: AcceptPmInviteContract.Dto
  ): Promise<AcceptPmInviteContract.Response> {
    const result =
      await this.amqpConnection.request<AcceptPmInviteContract.Response>({
        exchange,
        routingKey,
        payload: dto,
      });

    return handleRpcRequest(result, async (response) => response);
  }

  async rejectPmInvite(
    exchange: string,
    routingKey: string,
    dto: RejectPmInviteContract.Dto
  ): Promise<RejectPmInviteContract.Response> {
    const result =
      await this.amqpConnection.request<RejectPmInviteContract.Response>({
        exchange,
        routingKey,
        payload: dto,
      });

    return handleRpcRequest(result, async (response) => response);
  }

  async getProjectPmUser(
    exchange: string,
    routingKey: string,
    dto: GetProjectPmUserContract.Dto
  ): Promise<GetProjectPmUserContract.Response> {
    const result =
      await this.amqpConnection.request<GetProjectPmUserContract.Response>({
        exchange,
        routingKey,
        payload: dto,
      });

    return handleRpcRequest(result, async (response) => response);
  }

  async getProjectDeveloperUsers(
    exchange: string,
    routingKey: string,
    dto: GetProjectDeveloperUsersContract.Dto
  ): Promise<GetProjectDeveloperUsersContract.Response> {
    const result =
      await this.amqpConnection.request<GetProjectDeveloperUsersContract.Response>(
        {
          exchange,
          routingKey,
          payload: dto,
        }
      );

    return handleRpcRequest(result, async (response) => response);
  }

  async getPmInviteById(
    exchange: string,
    routingKey: string,
    dto: GetPmInviteByIdContract.Dto
  ): Promise<GetPmInviteByIdContract.Response> {
    const result =
      await this.amqpConnection.request<GetPmInviteByIdContract.Response>({
        exchange,
        routingKey,
        payload: dto,
      });

    return handleRpcRequest(result, async (response) => response);
  }

  async inviteDeveloper(
    exchange: string,
    routingKey: string,
    dto: InviteDeveloperContract.Dto
  ): Promise<InviteDeveloperContract.Response> {
    const result =
      await this.amqpConnection.request<InviteDeveloperContract.Response>({
        exchange,
        routingKey,
        payload: dto,
      });

    return handleRpcRequest(result, async (response) => response);
  }

  async acceptDeveloperInvite(
    exchange: string,
    routingKey: string,
    dto: AcceptDeveloperInviteContract.Dto
  ): Promise<AcceptDeveloperInviteContract.Response> {
    const result =
      await this.amqpConnection.request<AcceptDeveloperInviteContract.Response>(
        {
          exchange,
          routingKey,
          payload: dto,
        }
      );

    return handleRpcRequest(result, async (response) => response);
  }

  async rejectDeveloperInvite(
    exchange: string,
    routingKey: string,
    dto: RejectDeveloperInviteContract.Dto
  ): Promise<RejectDeveloperInviteContract.Response> {
    const result =
      await this.amqpConnection.request<RejectDeveloperInviteContract.Response>(
        {
          exchange,
          routingKey,
          payload: dto,
        }
      );

    return handleRpcRequest(result, async (response) => response);
  }

  async getDeveloperInviteById(
    exchange: string,
    routingKey: string,
    dto: GetDeveloperInviteByIdContract.Dto
  ): Promise<GetDeveloperInviteByIdContract.Response> {
    const result =
      await this.amqpConnection.request<GetDeveloperInviteByIdContract.Response>(
        {
          exchange,
          routingKey,
          payload: dto,
        }
      );

    return handleRpcRequest(result, async (response) => response);
  }
}
