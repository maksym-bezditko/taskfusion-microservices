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
import {
  InvitePmContract,
  AcceptPmInviteContract,
  AssignUserToProjectContract,
  RejectPmInviteContract,
  GetPmInviteByIdContract,
} from '@taskfusion-microservices/contracts';
import {
  UserType,
  InviteStatus,
  ProjectParticipantRole,
  PmInviteEntity,
} from '@taskfusion-microservices/entities';
import { InvitesService } from './invites.service';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';

@Injectable()
export class PmInvitesService {
  constructor(
    @InjectRepository(PmInviteEntity)
    readonly pmInviteEntityRepositoty: Repository<PmInviteEntity>,

    readonly amqpConnection: AmqpConnection,

    private readonly invitesService: InvitesService
  ) {}

  @RabbitRPC({
    exchange: InvitePmContract.exchange,
    routingKey: InvitePmContract.routingKey,
    queue: InvitePmContract.queue,
    errorBehavior: MessageHandlerErrorBehavior.NACK,
    errorHandler: defaultNackErrorHandler,
    allowNonJsonMessages: true,
    name: 'invite-pm',
  })
  async invitePm(
    dto: InvitePmContract.Dto
  ): Promise<InvitePmContract.Response> {
    const { clientUserId, email, projectId } = dto;

    const project = await this.invitesService.getProjectById(projectId);

    await this.invitesService.validateProjectClient(project, clientUserId);

    const pmUser = await this.invitesService.getUserByEmail(email, UserType.PM);
    const clientUser = await this.invitesService.getClientUserById(
      clientUserId
    );

    const existingInvite = await this.pmInviteEntityRepositoty.findOne({
      where: {
        clientUserId,
        pmUserId: pmUser.id,
        projectId: project.id,
      },
    });

    if (existingInvite) {
      return this.invitesService.handleExistingPmInvite(
        existingInvite,
        pmUser,
        clientUser
      );
    }

    const invite = await this.invitesService.createPmInvite(
      clientUserId,
      pmUser.id,
      project
    );

    this.invitesService.sendInvitationEmail({
      recipientEmail: pmUser.email,
      title: 'Project Invitation from TaskFusion',
      inviterName: clientUser.name,
      inviterEmail: clientUser.email,
      inviteId: invite.id,
      invitedUserType: UserType.PM,
    });

    return { id: invite.id };
  }

  @RabbitRPC({
    exchange: AcceptPmInviteContract.exchange,
    routingKey: AcceptPmInviteContract.routingKey,
    queue: AcceptPmInviteContract.queue,
    errorBehavior: MessageHandlerErrorBehavior.NACK,
    errorHandler: defaultNackErrorHandler,
    allowNonJsonMessages: true,
    name: 'accept-pm-invite',
  })
  async acceptPmInvite(
    dto: AcceptPmInviteContract.Dto
  ): Promise<AcceptPmInviteContract.Response> {
    const { inviteId, pmUserId } = dto;

    await this.invitesService.checkIfUserExists(pmUserId);

    const invite = await this.getPmInviteById({
      id: inviteId,
    });

    if (!invite) {
      throw new NotFoundException('Invite not found');
    }

    if (!this.invitesService.isPmInviteActive(invite)) {
      throw new BadRequestException('Invite is not valid anymore');
    }

    await this.pmInviteEntityRepositoty.update(
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
        userId: pmUserId,
        role: ProjectParticipantRole.PM,
      } as AssignUserToProjectContract.Dto,
    });

    return {
      success: true,
    };
  }

  @RabbitRPC({
    exchange: RejectPmInviteContract.exchange,
    routingKey: RejectPmInviteContract.routingKey,
    queue: RejectPmInviteContract.queue,
    errorBehavior: MessageHandlerErrorBehavior.NACK,
    errorHandler: defaultNackErrorHandler,
    allowNonJsonMessages: true,
    name: 'reject-pm-invite',
  })
  async rejectPmInvite(
    dto: RejectPmInviteContract.Dto
  ): Promise<RejectPmInviteContract.Response> {
    const { inviteId, pmUserId } = dto;

    await this.invitesService.checkIfUserExists(pmUserId);

    const invite = await this.pmInviteEntityRepositoty.findOne({
      where: {
        id: inviteId,
      },
    });

    if (!invite) {
      throw new NotFoundException('Invite not found');
    }

    if (!this.invitesService.isPmInviteActive(invite)) {
      throw new BadRequestException('Invite is not valid anymore');
    }

    await this.pmInviteEntityRepositoty.update(
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

  @RabbitRPC({
    exchange: GetPmInviteByIdContract.exchange,
    routingKey: GetPmInviteByIdContract.routingKey,
    queue: GetPmInviteByIdContract.queue,
    errorBehavior: MessageHandlerErrorBehavior.NACK,
    errorHandler: defaultNackErrorHandler,
    allowNonJsonMessages: true,
    name: 'get-pm-invite-by-id',
  })
  async getPmInviteById(
    dto: GetPmInviteByIdContract.Dto
  ): Promise<GetPmInviteByIdContract.Response> {
    const { id } = dto;

    const pmInvite = await this.pmInviteEntityRepositoty.findOne({
      where: {
        id,
      },
      relations: ['project'],
    });

    return pmInvite;
  }
}
