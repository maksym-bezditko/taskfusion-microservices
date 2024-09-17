import {
  RabbitRPC,
  MessageHandlerErrorBehavior,
  defaultNackErrorHandler,
} from '@golevelup/nestjs-rabbitmq';
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
import { BaseService, CustomAmqpConnection } from '@taskfusion-microservices/common';

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
    errorBehavior: MessageHandlerErrorBehavior.NACK,
    errorHandler: defaultNackErrorHandler,
    allowNonJsonMessages: true,
    name: 'invite-pm',
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

    if (project.clientId !== clientUserId) {
      throw new BadRequestException('Project does not belong to client');
    }

    const pmUser = await this.invitesHelperService.getUserByEmailOrThrow(email);

    await this.invitesHelperService.throwIfUserTypeDoesNotMatch(
      pmUser,
      UserType.PM
    );

    const clientUser = await this.getClientUserByIdOrThrow(
      clientUserId
    );

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
      return this.handleExistingPmInvite(
        existingInvite,
        pmUser,
        clientUser
      );
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

    return { id: invite.id };
  }

  async findPmInvite(where: FindOptionsWhere<PmInviteEntity>) {
    return this.pmInviteEntityRepositoty.findOne({
      where,
    });
  }

  async getClientUserById(clientUserId: number) {
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
  async getClientUserByIdOrThrow(clientUserId: number) {
    const clientUser = await this.getClientUserById(clientUserId);

    if (!clientUser) {
      this.logAndThrowError(
        new NotFoundException('Client user not found')
      );
    }

    return clientUser;
  }

  async handleExistingPmInvite(
    existingInvite: PmInviteEntity,
    pmUser: UserEntity,
    clientUser: UserEntity
  ) {
    switch (existingInvite.inviteStatus) {
      case InviteStatus.ACCEPTED:
        return this.logAndThrowError(
          'Invite already accepted'
        );

      case InviteStatus.REJECTED:
        return this.logAndThrowError(
          'Invite already rejected'
        );

      case InviteStatus.PENDING:
        return this.handlePendingExistingPmInvite(
          existingInvite,
          pmUser,
          clientUser
        );

      default:
        return this.logAndThrowError(
          'Unhandled invite status'
        );
    }
  }

  async handlePendingExistingPmInvite(
    existingInvite: PmInviteEntity,
    pmUser: UserEntity,
    clientUser: UserEntity
  ) {
    if (this.isPmInviteActive(existingInvite)) {
      this.logAndThrowError(
        'Active invite already exists'
      );
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

    return { id: existingInvite.id };
  }

  async updatePmInvite(
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

  async createPmInvite(
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

  @RabbitRPC({
    exchange: AcceptPmInviteContract.exchange,
    routingKey: AcceptPmInviteContract.routingKey,
    queue: AcceptPmInviteContract.queue,
    errorBehavior: MessageHandlerErrorBehavior.NACK,
    errorHandler: defaultNackErrorHandler,
    allowNonJsonMessages: true,
    name: 'accept-pm-invite',
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

    return this.invitesHelperService.assignUserToProject(
      invite.projectId,
      pmUserId,
      ProjectParticipantRole.PM
    );
  };

  @RabbitRPC({
    exchange: RejectPmInviteContract.exchange,
    routingKey: RejectPmInviteContract.routingKey,
    queue: RejectPmInviteContract.queue,
    errorBehavior: MessageHandlerErrorBehavior.NACK,
    errorHandler: defaultNackErrorHandler,
    allowNonJsonMessages: true,
    name: 'reject-pm-invite',
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

    return {
      success: true,
    };
  }

  async throwIfPmInviteIsNotActive(invite: PmInviteEntity) {
    if (!this.isPmInviteActive(invite)) {
      this.logAndThrowError(
        new BadRequestException('Invite is not valid anymore')
      );
    }
  }

  isPmInviteActive(invite: PmInviteEntity) {
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
    errorBehavior: MessageHandlerErrorBehavior.NACK,
    errorHandler: defaultNackErrorHandler,
    allowNonJsonMessages: true,
    name: 'get-pm-invite-by-id',
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
