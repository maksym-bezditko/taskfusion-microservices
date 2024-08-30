import { AmqpConnection } from '@golevelup/nestjs-rabbitmq';
import { Injectable } from '@nestjs/common';
import {
  AcceptPmInviteContract,
  CreateProjectContract,
  GetInviteByIdContract,
  GetProjectByIdContract,
  GetProjectPmUserContract,
  GetClientProjectsContract,
  InvitePmContract,
  RejectPmInviteContract,
  GetPmProjectsContract,
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

  async getInviteById(
    exchange: string,
    routingKey: string,
    dto: GetInviteByIdContract.Request
  ): Promise<GetInviteByIdContract.Response> {
    const result =
      await this.amqpConnection.request<GetInviteByIdContract.Response>({
        exchange,
        routingKey,
        payload: dto,
      });

    return handleRpcRequest(result, async (response) => response);
  }
}
