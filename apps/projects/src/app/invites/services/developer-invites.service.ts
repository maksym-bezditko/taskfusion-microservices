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
import { InjectRepository } from '@nestjs/typeorm';
import {
  GetDeveloperInviteByIdContract,
  InviteDeveloperContract,
  AcceptDeveloperInviteContract,
  RejectDeveloperInviteContract,
} from '@taskfusion-microservices/contracts';
import {
  UserType,
  InviteStatus,
  ProjectParticipantRole,
  DeveloperInviteEntity,
} from '@taskfusion-microservices/entities';
import { DeepPartial, FindOptionsWhere, Repository } from 'typeorm';
import { InvitesService } from './invites.service';

@Injectable()
export class DeveloperInvitesService {
  constructor(
    @InjectRepository(DeveloperInviteEntity)
    private readonly developerInviteEntityRepositoty: Repository<DeveloperInviteEntity>,
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
  async getDeveloperInviteByIdRpcHandler(
    dto: GetDeveloperInviteByIdContract.Dto
  ): Promise<GetDeveloperInviteByIdContract.Response> {
    return this.getDeveloperInviteById(dto.id);
  }

  private async getDeveloperInviteById(id: number) {
    return this.developerInviteEntityRepositoty.findOne({
      where: {
        id,
      },
      relations: ['project'],
    });
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
  async inviteDeveloperRpcHandler(
    dto: InviteDeveloperContract.Dto
  ): Promise<InviteDeveloperContract.Response> {
    console.log(dto);

    return this.inviteDeveloper(dto.pmUserId, dto.email, dto.projectId);
  }

  private async inviteDeveloper(
    pmUserId: number,
    email: string,
    projectId: number
  ) {
    const project = await this.invitesService.getProjectByIdOrThrow(projectId);

    const projectPmId = await this.invitesService.getProjectPmId(project.id);

    if (projectPmId !== pmUserId) {
      throw new BadRequestException('Project not found');
    }

    const developerUser = await this.invitesService.getUserByEmail(email);

    await this.invitesService.throwIfUserTypeDoesNotMatch(
      developerUser,
      UserType.DEVELOPER
    );

    const pmUser = await this.invitesService.getUserById(pmUserId);

    await this.invitesService.throwIfUserTypeDoesNotMatch(pmUser, UserType.PM);

    const existingInvite = await this.findDeveloperInvite({
      pmUserId: pmUser.id,
      projectId: project.id,
      developerUserId: developerUser.id,
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

  private async findDeveloperInvite(
    where: FindOptionsWhere<DeveloperInviteEntity>
  ) {
    return this.developerInviteEntityRepositoty.findOne({
      where,
    });
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
  async acceptDeveloperInviteRpcHandler(
    dto: AcceptDeveloperInviteContract.Dto
  ): Promise<AcceptDeveloperInviteContract.Response> {
    return this.acceptDeveloperInvite(dto.inviteId, dto.developerUserId);
  }

  private async acceptDeveloperInvite(
    inviteId: number,
    developerUserId: number
  ) {
    await this.invitesService.throwIfUserDoesNotExist(developerUserId);

    const invite = await this.getDeveloperInviteByIdOrThrow(inviteId);

    const isDeveloperInviteActive =
      this.invitesService.isDeveloperInviteActive(invite);

    if (!isDeveloperInviteActive) {
      throw new BadRequestException('Invite is not valid anymore');
    }

    await this.updateDeveloperInvite(invite, {
      inviteStatus: InviteStatus.ACCEPTED,
    });

    return this.invitesService.assignUserToProject(
      invite.projectId,
      developerUserId,
      ProjectParticipantRole.DEVELOPER
    );
  }

  private async getDeveloperInviteByIdOrThrow(id: number) {
    const invite = await this.getDeveloperInviteById(id);

    if (!invite) {
      throw new NotFoundException('Invite not found');
    }

    return invite;
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
  async rejectDeveloperInviteRpcHandler(
    dto: RejectDeveloperInviteContract.Dto
  ): Promise<RejectDeveloperInviteContract.Response> {
    return this.rejectDeveloperInvite(dto.inviteId, dto.developerUserId);
  }

  private async rejectDeveloperInvite(
    inviteId: number,
    developerUserId: number
  ) {
    await this.invitesService.throwIfUserDoesNotExist(developerUserId);

    const invite = await this.getDeveloperInviteByIdOrThrow(inviteId);

    const isDeveloperInviteActive =
      this.invitesService.isDeveloperInviteActive(invite);

    if (!isDeveloperInviteActive) {
      throw new BadRequestException('Invite is not valid anymore');
    }

    await this.updateDeveloperInvite(invite, {
      inviteStatus: InviteStatus.REJECTED,
    });

    return {
      success: true,
    };
  }

  private async updateDeveloperInvite(
    existingInvite: DeveloperInviteEntity,
    updatedFields: DeepPartial<DeveloperInviteEntity>
  ) {
    await this.developerInviteEntityRepositoty.update(
      {
        id: existingInvite.id,
      },
      updatedFields
    );
  }
}
