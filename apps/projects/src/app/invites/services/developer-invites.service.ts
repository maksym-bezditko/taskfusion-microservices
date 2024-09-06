import {
  RabbitRPC,
  MessageHandlerErrorBehavior,
  defaultNackErrorHandler,
  AmqpConnection,
} from '@golevelup/nestjs-rabbitmq';
import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import {
  GetDeveloperInviteByIdContract,
  InviteDeveloperContract,
  AcceptDeveloperInviteContract,
  AssignUserToProjectContract,
  RejectDeveloperInviteContract,
} from '@taskfusion-microservices/contracts';
import {
  UserType,
  InviteStatus,
  ProjectParticipantRole,
  DeveloperInviteEntity,
} from '@taskfusion-microservices/entities';
import { Repository } from 'typeorm';
import { InvitesService } from './invites.service';

@Injectable()
export class DeveloperInvitesService {
  constructor(
    @InjectRepository(DeveloperInviteEntity)
    readonly developerInviteEntityRepositoty: Repository<DeveloperInviteEntity>,

    readonly amqpConnection: AmqpConnection,

    private readonly invitesService: InvitesService
  ) {}

  @RabbitRPC({
    exchange: GetDeveloperInviteByIdContract.exchange,
    routingKey: GetDeveloperInviteByIdContract.routingKey,
    queue: GetDeveloperInviteByIdContract.queue,
    errorBehavior: MessageHandlerErrorBehavior.NACK,
    errorHandler: defaultNackErrorHandler,
    allowNonJsonMessages: true,
    name: 'get-developer-invite-by-id',
  })
  async getDeveloperInviteById(
    dto: GetDeveloperInviteByIdContract.Dto
  ): Promise<GetDeveloperInviteByIdContract.Response> {
    const { id } = dto;

    const developerInvite = await this.developerInviteEntityRepositoty.findOne({
      where: {
        id,
      },
      relations: ['project'],
    });

    return developerInvite;
  }

  @RabbitRPC({
    exchange: InviteDeveloperContract.exchange,
    routingKey: InviteDeveloperContract.routingKey,
    queue: InviteDeveloperContract.queue,
    errorBehavior: MessageHandlerErrorBehavior.NACK,
    errorHandler: defaultNackErrorHandler,
    allowNonJsonMessages: true,
    name: 'invite-developer',
  })
  async inviteDeveloper(
    dto: InviteDeveloperContract.Dto
  ): Promise<InviteDeveloperContract.Response> {
    const { pmUserId, email, projectId } = dto;

    const project = await this.invitesService.getProjectById(projectId);

    await this.invitesService.validateProjectPm(project, pmUserId);

    const developerUser = await this.invitesService.getUserByEmail(
      email,
      UserType.DEVELOPER
    );
    const pmUser = await this.invitesService.getUserById(pmUserId, UserType.PM);

    const existingInvite = await this.developerInviteEntityRepositoty.findOne({
      where: {
        pmUserId: pmUser.id,
        projectId: project.id,
        developerUserId: developerUser.id,
      },
    });

    if (existingInvite) {
      return this.invitesService.handleExistingDeveloperInvite(
        existingInvite,
        pmUser,
        developerUser
      );
    }

    const invite = await this.invitesService.createDeveloperInvite(
      pmUser.id,
      developerUser.id,
      project
    );

    this.invitesService.sendInvitationEmail({
      recipientEmail: developerUser.email,
      title: 'Project Invitation from TaskFusion',
      inviterName: pmUser.name,
      inviterEmail: pmUser.email,
      inviteId: invite.id,
      invitedUserType: UserType.DEVELOPER,
    });

    return { id: invite.id };
  }

  @RabbitRPC({
    exchange: AcceptDeveloperInviteContract.exchange,
    routingKey: AcceptDeveloperInviteContract.routingKey,
    queue: AcceptDeveloperInviteContract.queue,
    errorBehavior: MessageHandlerErrorBehavior.NACK,
    errorHandler: defaultNackErrorHandler,
    allowNonJsonMessages: true,
    name: 'accept-developer-invite',
  })
  async acceptDeveloperInvite(
    dto: AcceptDeveloperInviteContract.Dto
  ): Promise<AcceptDeveloperInviteContract.Response> {
    const { inviteId, developerUserId } = dto;

    await this.invitesService.checkIfUserExists(developerUserId);

    const invite = await this.developerInviteEntityRepositoty.findOne({
      where: {
        id: inviteId,
      },
    });

    if (!invite) {
      throw new NotFoundException('Invite not found');
    }

    if (!this.invitesService.isDeveloperInviteActive(invite)) {
      throw new BadRequestException('Invite is not valid anymore');
    }

    await this.developerInviteEntityRepositoty.update(
      {
        id: inviteId,
      },
      {
        inviteStatus: InviteStatus.ACCEPTED,
        updatedAt: new Date(),
      }
    );

    await this.amqpConnection.request<AssignUserToProjectContract.Response>({
      exchange: AssignUserToProjectContract.exchange,
      routingKey: AssignUserToProjectContract.routingKey,
      payload: {
        projectId: invite.projectId,
        userId: developerUserId,
        role: ProjectParticipantRole.DEVELOPER,
      } as AssignUserToProjectContract.Dto,
    });

    return {
      success: true,
    };
  }

  @RabbitRPC({
    exchange: RejectDeveloperInviteContract.exchange,
    routingKey: RejectDeveloperInviteContract.routingKey,
    queue: RejectDeveloperInviteContract.queue,
    errorBehavior: MessageHandlerErrorBehavior.NACK,
    errorHandler: defaultNackErrorHandler,
    allowNonJsonMessages: true,
    name: 'reject-developer-invite',
  })
  async rejectDeveloperInvite(
    dto: RejectDeveloperInviteContract.Dto
  ): Promise<RejectDeveloperInviteContract.Response> {
    const { inviteId, developerUserId } = dto;

    await this.invitesService.checkIfUserExists(developerUserId);

    const invite = await this.developerInviteEntityRepositoty.findOne({
      where: {
        id: inviteId,
      },
    });

    if (!invite) {
      throw new NotFoundException('Invite not found');
    }

    if (!this.invitesService.isDeveloperInviteActive(invite)) {
      throw new BadRequestException('Invite is not valid anymore');
    }

    await this.developerInviteEntityRepositoty.update(
      {
        id: inviteId,
      },
      {
        inviteStatus: InviteStatus.REJECTED,
        updatedAt: new Date(),
      }
    );

    return {
      success: true,
    };
  }
}
