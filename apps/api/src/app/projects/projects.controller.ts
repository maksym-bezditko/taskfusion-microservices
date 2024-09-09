import { Body, Controller, Get, Param, Post, UseGuards } from '@nestjs/common';
import {
  AcceptPmInviteContract,
  CreateProjectContract,
  GetPmInviteByIdContract,
  GetProjectByIdContract,
  GetProjectPmUserContract,
  GetClientProjectsContract,
  InvitePmContract,
  RejectPmInviteContract,
  InviteDeveloperContract,
  AcceptDeveloperInviteContract,
  RejectDeveloperInviteContract,
  GetDeveloperInviteByIdContract,
  GetProjectDeveloperUsersContract,
  GetDeveloperProjectsContract,
  GetPmProjectsContract,
} from '@taskfusion-microservices/contracts';
import {
  AtJwtGuard,
  ClientGuard,
  DeveloperGuard,
  PmGuard,
  UserIdFromJwt,
} from '@taskfusion-microservices/common';
import { AmqpConnection } from '@golevelup/nestjs-rabbitmq';
import { handleRpcRequest } from '@taskfusion-microservices/helpers';

@Controller('projects')
export class ProjectsController {
  constructor(private readonly amqpConnection: AmqpConnection) {}

  @UseGuards(AtJwtGuard)
  @Post('create-project')
  async createProject(
    @Body() dto: CreateProjectContract.Request
  ): Promise<CreateProjectContract.Response> {
    const result =
      await this.amqpConnection.request<CreateProjectContract.Response>({
        exchange: CreateProjectContract.exchange,
        routingKey: CreateProjectContract.routingKey,
        payload: dto as CreateProjectContract.Dto,
      });

    return handleRpcRequest(result, async (response) => response);
  }

  @UseGuards(AtJwtGuard, ClientGuard)
  @Get('get-client-projects')
  async getClientProjects(
    @UserIdFromJwt() clientUserId: number
  ): Promise<GetClientProjectsContract.Response> {
    const result =
      await this.amqpConnection.request<GetClientProjectsContract.Response>({
        exchange: GetClientProjectsContract.exchange,
        routingKey: GetClientProjectsContract.routingKey,
        payload: {
          clientUserId,
        } as GetClientProjectsContract.Dto,
      });

    return handleRpcRequest(result, async (response) => response);
  }

  @UseGuards(AtJwtGuard, DeveloperGuard)
  @Get('get-developer-projects')
  async getDeveloperProjects(
    @UserIdFromJwt() developerUserId: number
  ): Promise<GetDeveloperProjectsContract.Response> {
    const result =
      await this.amqpConnection.request<GetDeveloperProjectsContract.Response>({
        exchange: GetDeveloperProjectsContract.exchange,
        routingKey: GetDeveloperProjectsContract.routingKey,
        payload: {
          developerUserId,
        } as GetDeveloperProjectsContract.Dto,
      });

    return handleRpcRequest(result, async (response) => response);
  }

  @UseGuards(AtJwtGuard, PmGuard)
  @Get('get-pm-projects')
  async getPmProjects(
    @UserIdFromJwt() pmUserId: number
  ): Promise<GetPmProjectsContract.Response> {
    const result =
      await this.amqpConnection.request<GetPmProjectsContract.Response>({
        exchange: GetPmProjectsContract.exchange,
        routingKey: GetPmProjectsContract.routingKey,
        payload: {
          pmUserId,
        } as GetPmProjectsContract.Dto,
      });

    return handleRpcRequest(result, async (response) => response);
  }

  @UseGuards(AtJwtGuard)
  @Get(':id')
  async getProjectById(
    @Param('id') id: number
  ): Promise<GetProjectByIdContract.Response> {
    const result =
      await this.amqpConnection.request<GetProjectByIdContract.Response>({
        exchange: GetProjectByIdContract.exchange,
        routingKey: GetProjectByIdContract.routingKey,
        payload: {
          projectId: id,
        } as GetProjectByIdContract.Dto,
      });

    return handleRpcRequest(result, async (response) => response);
  }

  @UseGuards(AtJwtGuard, ClientGuard)
  @Post('/invites/invite-pm')
  async invitePm(
    @Body() dto: InvitePmContract.Request,
    @UserIdFromJwt() userId: number
  ) {
    const result = await this.amqpConnection.request<InvitePmContract.Response>(
      {
        exchange: InvitePmContract.exchange,
        routingKey: InvitePmContract.routingKey,
        payload: {
          clientUserId: userId,
          email: dto.email,
          projectId: dto.projectId,
        } as InvitePmContract.Dto,
      }
    );

    return handleRpcRequest(result, async (response) => response);
  }

  @UseGuards(AtJwtGuard, PmGuard)
  @Post('/invites/accept-pm-invite')
  async acceptPmInvite(
    @Body() dto: AcceptPmInviteContract.Request,
    @UserIdFromJwt() userId: number
  ) {
    const result =
      await this.amqpConnection.request<AcceptPmInviteContract.Response>({
        exchange: AcceptPmInviteContract.exchange,
        routingKey: AcceptPmInviteContract.routingKey,
        payload: {
          inviteId: dto.inviteId,
          pmUserId: userId,
        } as AcceptPmInviteContract.Dto,
      });

    return handleRpcRequest(result, async (response) => response);
  }

  @UseGuards(AtJwtGuard, PmGuard)
  @Post('/invites/reject-pm-invite')
  async rejectPmInvite(
    @Body() dto: RejectPmInviteContract.Request,
    @UserIdFromJwt() userId: number
  ) {
    const result =
      await this.amqpConnection.request<RejectPmInviteContract.Response>({
        exchange: RejectPmInviteContract.exchange,
        routingKey: RejectPmInviteContract.routingKey,
        payload: {
          inviteId: dto.inviteId,
          pmUserId: userId,
        } as RejectPmInviteContract.Dto,
      });

    return handleRpcRequest(result, async (response) => response);
  }

  @UseGuards(AtJwtGuard)
  @Post('/invites/get-pm-invite-by-id')
  async getInviteById(@Body() dto: GetPmInviteByIdContract.Request) {
    const result =
      await this.amqpConnection.request<GetPmInviteByIdContract.Response>({
        exchange: GetPmInviteByIdContract.exchange,
        routingKey: GetPmInviteByIdContract.routingKey,
        payload: dto as GetPmInviteByIdContract.Dto,
      });

    return handleRpcRequest(result, async (response) => response);
  }

  @UseGuards(AtJwtGuard)
  @Post('/get-project-pm-user')
  async getProjectPmUser(@Body() dto: GetProjectPmUserContract.Request) {
    const result =
      await this.amqpConnection.request<GetProjectPmUserContract.Response>({
        exchange: GetProjectPmUserContract.exchange,
        routingKey: GetProjectPmUserContract.routingKey,
        payload: dto as GetProjectPmUserContract.Dto,
      });

    return handleRpcRequest(result, async (response) => response);
  }

  @UseGuards(AtJwtGuard)
  @Post('/get-project-developer-users')
  async getProjectDeveloperUsers(
    @Body() dto: GetProjectDeveloperUsersContract.Request
  ) {
    const result =
      await this.amqpConnection.request<GetProjectDeveloperUsersContract.Response>(
        {
          exchange: GetProjectDeveloperUsersContract.exchange,
          routingKey: GetProjectDeveloperUsersContract.routingKey,
          payload: dto as GetProjectDeveloperUsersContract.Dto,
        }
      );

    return handleRpcRequest(result, async (response) => response);
  }

  @UseGuards(AtJwtGuard, PmGuard)
  @Post('/invites/invite-developer')
  async inviteDeveloper(
    @Body() dto: InviteDeveloperContract.Request,
    @UserIdFromJwt() userId: number
  ) {
    const result =
      await this.amqpConnection.request<InviteDeveloperContract.Response>({
        exchange: InviteDeveloperContract.exchange,
        routingKey: InviteDeveloperContract.routingKey,
        payload: {
          pmUserId: userId,
          email: dto.email,
          projectId: dto.projectId,
        } as InviteDeveloperContract.Dto,
      });

    return handleRpcRequest(result, async (response) => response);
  }

  @UseGuards(AtJwtGuard, DeveloperGuard)
  @Post('/invites/accept-developer-invite')
  async acceptDeveloperInvite(
    @Body() dto: AcceptDeveloperInviteContract.Request,
    @UserIdFromJwt() userId: number
  ) {
    const result =
      await this.amqpConnection.request<AcceptDeveloperInviteContract.Response>(
        {
          exchange: AcceptDeveloperInviteContract.exchange,
          routingKey: AcceptDeveloperInviteContract.routingKey,
          payload: {
            inviteId: dto.inviteId,
            developerUserId: userId,
          } as AcceptDeveloperInviteContract.Dto,
        }
      );

    return handleRpcRequest(result, async (response) => response);
  }

  @UseGuards(AtJwtGuard, DeveloperGuard)
  @Post('/invites/reject-developer-invite')
  async rejectDeveloperInvite(
    @Body() dto: RejectDeveloperInviteContract.Request,
    @UserIdFromJwt() userId: number
  ) {
    const result =
      await this.amqpConnection.request<RejectDeveloperInviteContract.Response>(
        {
          exchange: RejectDeveloperInviteContract.exchange,
          routingKey: RejectDeveloperInviteContract.routingKey,
          payload: {
            inviteId: dto.inviteId,
            developerUserId: userId,
          } as RejectDeveloperInviteContract.Dto,
        }
      );

    return handleRpcRequest(result, async (response) => response);
  }

  @UseGuards(AtJwtGuard)
  @Post('/invites/get-developer-invite-by-id')
  async getDeveloperInviteById(
    @Body() dto: GetDeveloperInviteByIdContract.Request
  ) {
    const result =
      await this.amqpConnection.request<GetDeveloperInviteByIdContract.Response>(
        {
          exchange: GetDeveloperInviteByIdContract.exchange,
          routingKey: GetDeveloperInviteByIdContract.routingKey,
          payload: dto as GetDeveloperInviteByIdContract.Dto,
        }
      );

    return handleRpcRequest(result, async (response) => response);
  }
}
