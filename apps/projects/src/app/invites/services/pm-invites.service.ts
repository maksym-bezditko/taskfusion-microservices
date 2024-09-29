import { defaultNackErrorHandler, RabbitRPC } from '@golevelup/nestjs-rabbitmq';
import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import {
  InvitePmContract,
  AcceptPmInviteContract,
  RejectPmInviteContract,
  GetPmInviteByIdContract,
  GetUserByIdContract,
  CreateNotificationContract,
} from '@taskfusion-microservices/contracts';
import {
  UserType,
  InviteStatus,
  ProjectParticipantRole,
  PmInviteEntity,
  ProjectEntity,
  UserEntity,
} from '@taskfusion-microservices/entities';
import { InvitesHelperService } from './invites-helper.service';
import { InjectRepository } from '@nestjs/typeorm';
import { DeepPartial, FindOptionsWhere, Repository } from 'typeorm';
import {
  BaseService,
  CustomAmqpConnection,
} from '@taskfusion-microservices/common';

@Injectable()
export class PmInvitesService extends BaseService {
  constructor(
    @InjectRepository(PmInviteEntity)
    private readonly pmInviteEntityRepositoty: Repository<PmInviteEntity>,
    private readonly customAmqpConnection: CustomAmqpConnection,
    private readonly invitesHelperService: InvitesHelperService
  ) {
    super(PmInvitesService.name);
  }

  @RabbitRPC({
    exchange: InvitePmContract.exchange,
    routingKey: InvitePmContract.routingKey,
    queue: InvitePmContract.queue,
    errorHandler: defaultNackErrorHandler,
  })
  async invitePmRpcHandler(
    dto: InvitePmContract.Dto
  ): Promise<InvitePmContract.Response> {
    return this.invitePm(dto.clientUserId, dto.email, dto.projectId);
  }

  private async invitePm(
    clientUserId: number,
    email: string,
    projectId: number
  ) {
    const project = await this.invitesHelperService.getProjectByIdOrThrow(
      projectId
    );

    if (project.clientUserId !== clientUserId) {
      throw new BadRequestException('Project does not belong to client');
    }

    const pmUser = await this.invitesHelperService.getUserByEmailOrThrow(email);

    await this.invitesHelperService.throwIfUserTypeDoesNotMatch(
      pmUser,
      UserType.PM
    );

    const clientUser = await this.getClientUserByIdOrThrow(clientUserId);

    await this.invitesHelperService.throwIfUserTypeDoesNotMatch(
      clientUser,
      UserType.CLIENT
    );

    const existingInvite = await this.findPmInvite({
      clientUserId,
      pmUserId: pmUser.id,
      projectId: project.id,
    });

    if (existingInvite) {
      return this.handleExistingPmInvite(existingInvite, pmUser, clientUser);
    }

    const invite = await this.createPmInvite(clientUserId, pmUser.id, project);

    await this.invitesHelperService.sendInvitationEmail({
      recipientEmail: pmUser.email,
      title: 'Project Invitation from TaskFusion',
      inviterName: clientUser.name,
      inviterEmail: clientUser.email,
      inviteId: invite.id,
      invitedUserType: UserType.PM,
    });

    await this.sendInAppNotification(
      'Project Invitation',
      `/pm/project-invitation/${invite.id}`,
      pmUser.id
    );

    return { id: invite.id };
  }

  private async findPmInvite(where: FindOptionsWhere<PmInviteEntity>) {
    return this.pmInviteEntityRepositoty.findOne({
      where,
    });
  }

  private async getClientUserById(clientUserId: number) {
    const payload: GetUserByIdContract.Dto = {
      id: clientUserId,
    };

    const clientUser =
      await this.customAmqpConnection.requestOrThrow<GetUserByIdContract.Response>(
        GetUserByIdContract.routingKey,
        payload
      );

    return clientUser;
  }

  private async getClientUserByIdOrThrow(clientUserId: number) {
    const clientUser = await this.getClientUserById(clientUserId);

    if (!clientUser) {
      this.logAndThrowError(new NotFoundException('Client user not found'));
    }

    return clientUser;
  }

  private async handleExistingPmInvite(
    existingInvite: PmInviteEntity,
    pmUser: UserEntity,
    clientUser: UserEntity
  ) {
    switch (existingInvite.inviteStatus) {
      case InviteStatus.ACCEPTED:
        return this.logAndThrowError('Invite already accepted');

      case InviteStatus.REJECTED:
        return this.logAndThrowError('Invite already rejected');

      case InviteStatus.PENDING:
        return this.handlePendingExistingPmInvite(
          existingInvite,
          pmUser,
          clientUser
        );

      default:
        return this.logAndThrowError('Unhandled invite status');
    }
  }

  private async handlePendingExistingPmInvite(
    existingInvite: PmInviteEntity,
    pmUser: UserEntity,
    clientUser: UserEntity
  ) {
    if (this.isPmInviteActive(existingInvite)) {
      this.logAndThrowError('Active invite already exists');
    }

    await this.updatePmInvite(existingInvite, {
      expiresAt: new Date(Date.now() + 1000 * 60 * 60 * 24), // 1 day
    });

    this.invitesHelperService.sendInvitationEmail({
      recipientEmail: pmUser.email,
      title: 'Project Invitation from TaskFusion',
      inviterName: clientUser.name,
      inviterEmail: clientUser.email,
      inviteId: existingInvite.id,
      invitedUserType: UserType.PM,
    });

    await this.sendInAppNotification(
      'Project Invitation was updated',
      `/pm/project-invitation/${existingInvite.id}`,
      pmUser.id
    );

    return { id: existingInvite.id };
  }

  private async updatePmInvite(
    existingInvite: PmInviteEntity,
    updatedFields: DeepPartial<PmInviteEntity>
  ) {
    await this.pmInviteEntityRepositoty.update(
      {
        id: existingInvite.id,
      },
      updatedFields
    );
  }

  private async createPmInvite(
    clientUserId: number,
    pmUserId: number,
    project: ProjectEntity
  ) {
    return this.pmInviteEntityRepositoty.save({
      clientUserId,
      pmUserId,
      project,
      isActive: true,
      expiresAt: new Date(Date.now() + 1000 * 60 * 60 * 24), // 1 day
      createdAt: new Date(),
      updatedAt: new Date(),
    });
  }

  private async sendInAppNotification(
    title: string,
    redirectUrl: string,
    userId: number
  ) {
    await this.customAmqpConnection.publishOrThrow(
      CreateNotificationContract.routingKey,
      {
        title,
        redirectUrl,
        userId,
      }
    );
  }

  @RabbitRPC({
    exchange: AcceptPmInviteContract.exchange,
    routingKey: AcceptPmInviteContract.routingKey,
    queue: AcceptPmInviteContract.queue,
    errorHandler: defaultNackErrorHandler,
  })
  async acceptPmInviteRpcHandler(
    dto: AcceptPmInviteContract.Dto
  ): Promise<AcceptPmInviteContract.Response> {
    return this.acceptPmInvite(dto.inviteId, dto.pmUserId);
  }

  private readonly acceptPmInvite = async (
    inviteId: number,
    pmUserId: number
  ) => {
    await this.invitesHelperService.throwIfUserDoesNotExist(pmUserId);

    const invite = await this.getPmInviteById(inviteId);

    if (!invite) {
      throw new NotFoundException('Invite not found');
    }

    this.throwIfPmInviteIsNotActive(invite);

    await this.updatePmInvite(invite, {
      inviteStatus: InviteStatus.ACCEPTED,
    });

    const response = await this.invitesHelperService.assignUserToProject(
      invite.projectId,
      pmUserId,
      ProjectParticipantRole.PM
    );

    await this.sendInAppNotification(
      'Project Invitation was accepted',
      `/pm/project-invitation/${inviteId}`,
      invite.clientUserId
    );

    return response;
  };

  @RabbitRPC({
    exchange: RejectPmInviteContract.exchange,
    routingKey: RejectPmInviteContract.routingKey,
    queue: RejectPmInviteContract.queue,
    errorHandler: defaultNackErrorHandler,
  })
  async rejectPmInviteRpcHandler(
    dto: RejectPmInviteContract.Dto
  ): Promise<RejectPmInviteContract.Response> {
    return this.rejectPmInvite(dto.inviteId, dto.pmUserId);
  }

  private async rejectPmInvite(inviteId: number, pmUserId: number) {
    await this.invitesHelperService.throwIfUserDoesNotExist(pmUserId);

    const invite = await this.getPmInviteById(inviteId);

    if (!invite) {
      throw new NotFoundException('Invite not found');
    }

    await this.throwIfPmInviteIsNotActive(invite);

    await this.updatePmInvite(invite, {
      inviteStatus: InviteStatus.REJECTED,
    });

    await this.sendInAppNotification(
      'Project Invitation was rejected',
      `/pm/project-invitation/${inviteId}`,
      invite.clientUserId
    );

    return {
      success: true,
    };
  }

  private async throwIfPmInviteIsNotActive(invite: PmInviteEntity) {
    if (!this.isPmInviteActive(invite)) {
      this.logAndThrowError(
        new BadRequestException('Invite is not valid anymore')
      );
    }
  }

  private isPmInviteActive(invite: PmInviteEntity) {
    return (
      new Date(invite.expiresAt) > new Date() &&
      invite.pmUserId === invite.pmUserId &&
      invite.inviteStatus === InviteStatus.PENDING
    );
  }

  @RabbitRPC({
    exchange: GetPmInviteByIdContract.exchange,
    routingKey: GetPmInviteByIdContract.routingKey,
    queue: GetPmInviteByIdContract.queue,
    errorHandler: defaultNackErrorHandler,
  })
  async getPmInviteByIdRpcHandler(
    dto: GetPmInviteByIdContract.Dto
  ): Promise<GetPmInviteByIdContract.Response> {
    return this.getPmInviteById(dto.id);
  }

  private getPmInviteById(id: number) {
    return this.pmInviteEntityRepositoty.findOne({
      where: {
        id,
      },
      relations: ['project'],
    });
  }
}
