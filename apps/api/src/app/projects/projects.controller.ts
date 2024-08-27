import { Body, Controller, Get, Param, Post, UseGuards } from '@nestjs/common';
import { ProjectsService } from './projects.service';
import {
  AcceptPmInviteContract,
  CreateProjectContract,
  GetProjectByIdContract,
  GetProjectPmUserContract,
  GetProjectsContract,
  InvitePmContract,
  RejectPmInviteContract,
} from '@taskfusion-microservices/contracts';
import {
  AtJwtGuard,
  ClientGuard,
  PmGuard,
  UserIdFromJwt,
} from '@taskfusion-microservices/common';

@Controller('projects')
export class ProjectsController {
  constructor(private readonly projectsService: ProjectsService) {}

  @UseGuards(AtJwtGuard)
  @Post('create-project')
  async createProject(
    @Body() dto: CreateProjectContract.Request
  ): Promise<CreateProjectContract.Response> {
    return this.projectsService.createProject(
      CreateProjectContract.exchange,
      CreateProjectContract.routingKey,
      dto
    );
  }

  @UseGuards(AtJwtGuard)
  @Get()
  async getProjects(
    @UserIdFromJwt() userId: number
  ): Promise<GetProjectsContract.Response> {
    return this.projectsService.getProjects(
      GetProjectsContract.exchange,
      GetProjectsContract.routingKey,
      {
        userId,
      }
    );
  }

  @UseGuards(AtJwtGuard)
  @Get(':id')
  async getProjectById(
    @UserIdFromJwt() userId: number,
    @Param('id') id: number
  ): Promise<GetProjectByIdContract.Response> {
    return this.projectsService.getProjectById(
      GetProjectByIdContract.exchange,
      GetProjectByIdContract.routingKey,
      {
        projectId: id,
      }
    );
  }

  @UseGuards(AtJwtGuard, ClientGuard)
  @Post('/invites/invite-pm')
  async invitePm(
    @Body() dto: InvitePmContract.Request,
    @UserIdFromJwt() userId: number
  ) {
    return this.projectsService.invitePm(
      InvitePmContract.exchange,
      InvitePmContract.routingKey,
      {
        clientUserId: userId,
        email: dto.email,
        projectId: dto.projectId,
      }
    );
  }

  @UseGuards(AtJwtGuard, PmGuard)
  @Post('/invites/accept-pm-invite')
  async acceptPmInvite(
    @Body() dto: AcceptPmInviteContract.Request,
    @UserIdFromJwt() userId: number
  ) {
    return this.projectsService.acceptPmInvite(
      AcceptPmInviteContract.exchange,
      AcceptPmInviteContract.routingKey,
      {
        inviteId: dto.inviteId,
        pmUserId: userId,
      }
    );
  }

  @UseGuards(AtJwtGuard, PmGuard)
  @Post('/invites/reject-pm-invite')
  async rejectPmInvite(
    @Body() dto: RejectPmInviteContract.Request,
    @UserIdFromJwt() userId: number
  ) {
    return this.projectsService.rejectPmInvite(
      RejectPmInviteContract.exchange,
      RejectPmInviteContract.routingKey,
      {
        inviteId: dto.inviteId,
        pmUserId: userId,
      }
    );
  }

  @UseGuards(AtJwtGuard)
  @Post('/get-project-pm-user')
  async getProjectPmUser(@Body() dto: GetProjectPmUserContract.Request) {
    return this.projectsService.getProjectPmUser(
      GetProjectPmUserContract.exchange,
      GetProjectPmUserContract.routingKey,
      dto
    );
  }
}
