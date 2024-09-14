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
  CustomAmqpConnection,
  DeveloperGuard,
  PmGuard,
  UserIdFromJwt,
} from '@taskfusion-microservices/common';

@Controller('projects')
export class ProjectsController {
  constructor(private readonly customAmqpConnection: CustomAmqpConnection) {}

  @UseGuards(AtJwtGuard)
  @Post('create-project')
  async createProject(
    @Body() dto: CreateProjectContract.Request
  ): Promise<CreateProjectContract.Response> {
    return this.customAmqpConnection.requestOrThrow<CreateProjectContract.Response>(
      CreateProjectContract.routingKey,
      dto
    );
  }

  @UseGuards(AtJwtGuard, ClientGuard)
  @Get('get-client-projects')
  async getClientProjects(
    @UserIdFromJwt() clientUserId: number
  ): Promise<GetClientProjectsContract.Response> {
    const payload: GetClientProjectsContract.Dto = {
      clientUserId,
    };

    return this.customAmqpConnection.requestOrThrow<GetClientProjectsContract.Response>(
      GetClientProjectsContract.routingKey,
      payload
    );
  }

  @UseGuards(AtJwtGuard, DeveloperGuard)
  @Get('get-developer-projects')
  async getDeveloperProjects(
    @UserIdFromJwt() developerUserId: number
  ): Promise<GetDeveloperProjectsContract.Response> {
    const payload: GetDeveloperProjectsContract.Dto = {
      developerUserId,
    };

    return this.customAmqpConnection.requestOrThrow<GetDeveloperProjectsContract.Response>(
      GetDeveloperProjectsContract.routingKey,
      payload
    );
  }

  @UseGuards(AtJwtGuard, PmGuard)
  @Get('get-pm-projects')
  async getPmProjects(
    @UserIdFromJwt() pmUserId: number
  ): Promise<GetPmProjectsContract.Response> {
    const payload: GetPmProjectsContract.Dto = {
      pmUserId,
    };

    return this.customAmqpConnection.requestOrThrow<GetPmProjectsContract.Response>(
      GetPmProjectsContract.routingKey,
      payload
    );
  }

  @UseGuards(AtJwtGuard)
  @Get(':id')
  async getProjectById(
    @Param('id') id: number
  ): Promise<GetProjectByIdContract.Response> {
    const payload: GetProjectByIdContract.Dto = {
      projectId: id,
    };

    return this.customAmqpConnection.requestOrThrow<GetProjectByIdContract.Response>(
      GetProjectByIdContract.routingKey,
      payload
    );
  }

  @UseGuards(AtJwtGuard, ClientGuard)
  @Post('/invites/invite-pm')
  async invitePm(
    @Body() dto: InvitePmContract.Request,
    @UserIdFromJwt() userId: number
  ) {
    const payload: InvitePmContract.Dto = {
      clientUserId: userId,
      email: dto.email,
      projectId: dto.projectId,
    };

    return this.customAmqpConnection.requestOrThrow<InvitePmContract.Response>(
      InvitePmContract.routingKey,
      payload
    );
  }

  @UseGuards(AtJwtGuard, PmGuard)
  @Post('/invites/accept-pm-invite')
  async acceptPmInvite(
    @Body() dto: AcceptPmInviteContract.Request,
    @UserIdFromJwt() userId: number
  ) {
    const payload: AcceptPmInviteContract.Dto = {
      inviteId: dto.inviteId,
      pmUserId: userId,
    };

    return this.customAmqpConnection.requestOrThrow<AcceptPmInviteContract.Response>(
      AcceptPmInviteContract.routingKey,
      payload
    );
  }

  @UseGuards(AtJwtGuard, PmGuard)
  @Post('/invites/reject-pm-invite')
  async rejectPmInvite(
    @Body() dto: RejectPmInviteContract.Request,
    @UserIdFromJwt() userId: number
  ) {
    const payload: RejectPmInviteContract.Dto = {
      inviteId: dto.inviteId,
      pmUserId: userId,
    };

    return this.customAmqpConnection.requestOrThrow<RejectPmInviteContract.Response>(
      RejectPmInviteContract.routingKey,
      payload
    );
  }

  @UseGuards(AtJwtGuard)
  @Post('/invites/get-pm-invite-by-id')
  async getInviteById(@Body() dto: GetPmInviteByIdContract.Request) {
    return this.customAmqpConnection.requestOrThrow<GetPmInviteByIdContract.Response>(
      GetPmInviteByIdContract.routingKey,
      dto
    );
  }

  @UseGuards(AtJwtGuard)
  @Post('/get-project-pm-user')
  async getProjectPmUser(@Body() dto: GetProjectPmUserContract.Request) {
    return this.customAmqpConnection.requestOrThrow<GetProjectPmUserContract.Response>(
      GetProjectPmUserContract.routingKey,
      dto
    );
  }

  @UseGuards(AtJwtGuard)
  @Post('/get-project-developer-users')
  async getProjectDeveloperUsers(
    @Body() dto: GetProjectDeveloperUsersContract.Request
  ) {
    return this.customAmqpConnection.requestOrThrow<GetProjectDeveloperUsersContract.Response>(
      GetProjectDeveloperUsersContract.routingKey,
      dto
    );
  }

  @UseGuards(AtJwtGuard, PmGuard)
  @Post('/invites/invite-developer')
  async inviteDeveloper(
    @Body() dto: InviteDeveloperContract.Request,
    @UserIdFromJwt() userId: number
  ) {
    const payload: InviteDeveloperContract.Dto = {
      pmUserId: userId,
      email: dto.email,
      projectId: dto.projectId,
    };

    return this.customAmqpConnection.requestOrThrow<InviteDeveloperContract.Response>(
      InviteDeveloperContract.routingKey,
      payload
    );
  }

  @UseGuards(AtJwtGuard, DeveloperGuard)
  @Post('/invites/accept-developer-invite')
  async acceptDeveloperInvite(
    @Body() dto: AcceptDeveloperInviteContract.Request,
    @UserIdFromJwt() userId: number
  ) {
    const payload: AcceptDeveloperInviteContract.Dto = {
      inviteId: dto.inviteId,
      developerUserId: userId,
    };

    return this.customAmqpConnection.requestOrThrow<AcceptDeveloperInviteContract.Response>(
      AcceptDeveloperInviteContract.routingKey,
      payload
    );
  }

  @UseGuards(AtJwtGuard, DeveloperGuard)
  @Post('/invites/reject-developer-invite')
  async rejectDeveloperInvite(
    @Body() dto: RejectDeveloperInviteContract.Request,
    @UserIdFromJwt() userId: number
  ) {
    const payload: RejectDeveloperInviteContract.Dto = {
      inviteId: dto.inviteId,
      developerUserId: userId,
    };

    return this.customAmqpConnection.requestOrThrow<RejectDeveloperInviteContract.Response>(
      RejectDeveloperInviteContract.routingKey,
      payload
    );
  }

  @UseGuards(AtJwtGuard)
  @Post('/invites/get-developer-invite-by-id')
  async getDeveloperInviteById(
    @Body() dto: GetDeveloperInviteByIdContract.Request
  ) {
    return this.customAmqpConnection.requestOrThrow<GetDeveloperInviteByIdContract.Response>(
      GetDeveloperInviteByIdContract.routingKey,
      dto
    );
  }
}
