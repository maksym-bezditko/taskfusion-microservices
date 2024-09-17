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
} from '@taskfusion-microservices/contracts';
import {
  UserType,
  InviteStatus,
  ProjectParticipantRole,
  PmInviteEntity,
} from '@taskfusion-microservices/entities';
import { InvitesService } from './invites.service';
import { InjectRepository } from '@nestjs/typeorm';
import { DeepPartial, FindOptionsWhere, Repository } from 'typeorm';

@Injectable()
export class PmInvitesService {
  constructor(
    @InjectRepository(PmInviteEntity)
    private readonly pmInviteEntityRepositoty: Repository<PmInviteEntity>,
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
    const project = await this.invitesService.getProjectByIdOrThrow(projectId);

    if (project.clientId !== clientUserId) {
      throw new BadRequestException('Project does not belong to client');
    }

    const pmUser = await this.invitesService.getUserByEmailOrThrow(email);

    await this.invitesService.throwIfUserTypeDoesNotMatch(pmUser, UserType.PM);

    const clientUser = await this.invitesService.getClientUserByIdOrThrow(
      clientUserId
    );

    await this.invitesService.throwIfUserTypeDoesNotMatch(
      clientUser,
      UserType.CLIENT
    );

    const existingInvite = await this.findPmInvite({
      clientUserId,
      pmUserId: pmUser.id,
      projectId: project.id,
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

  private async findPmInvite(where: FindOptionsWhere<PmInviteEntity>) {
    return this.pmInviteEntityRepositoty.findOne({
      where,
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
    await this.invitesService.throwIfUserDoesNotExist(pmUserId);

    const invite = await this.getPmInviteById(inviteId);

    if (!invite) {
      throw new NotFoundException('Invite not found');
    }

    const isPmInviteActive = this.invitesService.isPmInviteActive(invite);

    if (!isPmInviteActive) {
      throw new BadRequestException('Invite is not valid anymore');
    }

    await this.updatePmInvite(invite, {
      inviteStatus: InviteStatus.ACCEPTED,
    });

    return this.invitesService.assignUserToProject(
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
    await this.invitesService.throwIfUserDoesNotExist(pmUserId);

    const invite = await this.getPmInviteById(inviteId);

    if (!invite) {
      throw new NotFoundException('Invite not found');
    }

    const isPmInviteActive = this.invitesService.isPmInviteActive(invite);

    if (!isPmInviteActive) {
      throw new BadRequestException('Invite is not valid anymore');
    }

    await this.updatePmInvite(invite, { inviteStatus: InviteStatus.REJECTED });

    return {
      success: true,
    };
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
