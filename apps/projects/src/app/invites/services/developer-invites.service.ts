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
  GetProjectPmIdContract,
} from '@taskfusion-microservices/contracts';
import {
  UserType,
  InviteStatus,
  ProjectParticipantRole,
  DeveloperInviteEntity,
  ProjectEntity,
  UserEntity,
} from '@taskfusion-microservices/entities';
import { DeepPartial, FindOptionsWhere, Repository } from 'typeorm';
import { InvitesHelperService } from './invites-helper.service';
import { BaseService, CustomAmqpConnection } from '@taskfusion-microservices/common';

@Injectable()
export class DeveloperInvitesService extends BaseService {
  constructor(
    @InjectRepository(DeveloperInviteEntity)
    private readonly developerInviteEntityRepositoty: Repository<DeveloperInviteEntity>,
    private readonly customAmqpConnection: CustomAmqpConnection,
    private readonly invitesHelperService: InvitesHelperService
  ) {
    super(DeveloperInvitesService.name);
  }

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
    const invite = await this.developerInviteEntityRepositoty.findOne({
      where: {
        id,
      },
      relations: ['project'],
    });

    return invite;
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
    return this.inviteDeveloper(dto.pmUserId, dto.email, dto.projectId);
  }

  private async inviteDeveloper(
    pmUserId: number,
    email: string,
    projectId: number
  ) {
    const project = await this.invitesHelperService.getProjectByIdOrThrow(
      projectId
    );

    const projectPmId = await this.getProjectPmId(project.id);

    if (projectPmId !== pmUserId) {
      throw new BadRequestException('Project not found');
    }

    const developerUser = await this.invitesHelperService.getUserByEmailOrThrow(
      email
    );

    await this.invitesHelperService.throwIfUserTypeDoesNotMatch(
      developerUser,
      UserType.DEVELOPER
    );

    const pmUser = await this.invitesHelperService.getUserByIdOrThrow(pmUserId);

    await this.invitesHelperService.throwIfUserTypeDoesNotMatch(
      pmUser,
      UserType.PM
    );

    const existingInvite = await this.findDeveloperInvite({
      pmUserId: pmUser.id,
      projectId: project.id,
      developerUserId: developerUser.id,
    });

    if (existingInvite) {
      return this.handleExistingDeveloperInvite(
        existingInvite,
        pmUser,
        developerUser
      );
    }

    const invite = await this.createDeveloperInvite(
      pmUser.id,
      developerUser.id,
      project
    );

    await this.invitesHelperService.sendInvitationEmail({
      recipientEmail: developerUser.email,
      title: 'Project Invitation from TaskFusion',
      inviterName: pmUser.name,
      inviterEmail: pmUser.email,
      inviteId: invite.id,
      invitedUserType: UserType.DEVELOPER,
    });

    return { id: invite.id };
  }

  async getProjectPmId(projectId: number) {
    const payload: GetProjectPmIdContract.Dto = {
      projectId,
    };

    const result =
      await this.customAmqpConnection.requestOrThrow<GetProjectPmIdContract.Response>(
        GetProjectPmIdContract.routingKey,
        payload
      );

    const { pmUserId: projectPmUserId } = result;

    return projectPmUserId;
  }

  async findDeveloperInvite(where: FindOptionsWhere<DeveloperInviteEntity>) {
    return this.developerInviteEntityRepositoty.findOne({
      where,
    });
  }

  async handleExistingDeveloperInvite(
    existingInvite: DeveloperInviteEntity,
    developerUser: UserEntity,
    pmUser: UserEntity
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
        return this.handlePendingExistingDeveloperInvite(
          existingInvite,
          pmUser,
          developerUser
        );

      default:
        return this.logAndThrowError(
          'Unhandled invite status'
        );
    }
  }

  private async handlePendingExistingDeveloperInvite(
    existingInvite: DeveloperInviteEntity,
    pmUser: UserEntity,
    developerUser: UserEntity
  ) {
    const isDeveloperInviteActive =
      this.isDeveloperInviteActive(existingInvite);

    if (isDeveloperInviteActive) {
      this.logAndThrowError(
        'Active invite already exists'
      );
    }

    await this.updateDeveloperInvite(
      existingInvite,
      { expiresAt: new Date(Date.now() + 1000 * 60 * 60 * 24) } // 1 day
    );

    this.invitesHelperService.sendInvitationEmail({
      recipientEmail: developerUser.email,
      title: 'Project Invitation from TaskFusion',
      inviterName: pmUser.name,
      inviterEmail: pmUser.email,
      inviteId: existingInvite.id,
      invitedUserType: UserType.DEVELOPER,
    });

    return { id: existingInvite.id };
  }

  async updateDeveloperInvite(
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

  async throwIfDeveloperInviteIsNotActive(invite: DeveloperInviteEntity) {
    if (!this.isDeveloperInviteActive(invite)) {
      this.logAndThrowError(
        new BadRequestException('Invite is not valid anymore')
      );
    }
  }

  isDeveloperInviteActive(invite: DeveloperInviteEntity) {
    return (
      new Date(invite.expiresAt) > new Date() &&
      invite.developerUserId === invite.developerUserId &&
      invite.inviteStatus === InviteStatus.PENDING
    );
  }

  async createDeveloperInvite(
    pmUserId: number,
    developerUserId: number,
    project: ProjectEntity
  ) {
    return this.developerInviteEntityRepositoty.save({
      developerUserId,
      pmUserId,
      project,
      isActive: true,
      expiresAt: new Date(Date.now() + 1000 * 60 * 60 * 24), // 1 day
      createdAt: new Date(),
      updatedAt: new Date(),
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
    await this.invitesHelperService.throwIfUserDoesNotExist(developerUserId);

    const invite = await this.getDeveloperInviteByIdOrThrow(inviteId);

    await this.throwIfDeveloperInviteIsNotActive(invite);

    await this.updateDeveloperInvite(invite, {
      inviteStatus: InviteStatus.ACCEPTED,
    });

    return this.invitesHelperService.assignUserToProject(
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
    await this.invitesHelperService.throwIfUserDoesNotExist(developerUserId);

    const invite = await this.getDeveloperInviteByIdOrThrow(inviteId);

    await this.throwIfDeveloperInviteIsNotActive(invite);

    await this.updateDeveloperInvite(invite, {
      inviteStatus: InviteStatus.REJECTED,
    });

    return {
      success: true,
    };
  }
}
