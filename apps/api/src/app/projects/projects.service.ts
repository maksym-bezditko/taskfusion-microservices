import { AmqpConnection } from '@golevelup/nestjs-rabbitmq';
import { Injectable } from '@nestjs/common';
import {
  AcceptPmInviteContract,
  CreateProjectContract,
  GetProjectByIdContract,
  GetProjectPmUserContract,
  GetProjectsContract,
  InvitePmContract,
  RejectPmInviteContract,
} from '@taskfusion-microservices/contracts';
import { handleRpcRequest } from '@taskfusion-microservices/helpers';

@Injectable()
export class ProjectsService {
  constructor(private readonly amqpConnection: AmqpConnection) {}

  async createProject(
    exchange: string,
    routingKey: string,
    dto: CreateProjectContract.Request
  ): Promise<CreateProjectContract.Response> {
    const result =
      await this.amqpConnection.request<CreateProjectContract.Response>({
        exchange,
        routingKey,
        payload: dto,
      });

    return handleRpcRequest(result, async (response) => response);
  }

  async getProjects(
    exchange: string,
    routingKey: string,
    dto: GetProjectsContract.Dto
  ): Promise<GetProjectsContract.Response> {
    const result =
      await this.amqpConnection.request<GetProjectsContract.Response>({
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
    dto: GetProjectPmUserContract.Request
  ): Promise<GetProjectPmUserContract.Response> {
    const result =
      await this.amqpConnection.request<GetProjectPmUserContract.Response>({
        exchange,
        routingKey,
        payload: dto,
      });

    return handleRpcRequest(result, async (response) => response);
  }
}
