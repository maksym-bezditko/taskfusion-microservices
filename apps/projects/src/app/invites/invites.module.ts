import { Module } from '@nestjs/common';
import { InvitesService } from './services/invites.service';
import { TypeOrmModule } from '@nestjs/typeorm';
import {
  PmInviteEntity,
  DeveloperInviteEntity,
} from '@taskfusion-microservices/entities';
import { ProjectsModule } from '../projects/projects.module';
import { PmInvitesService } from './services/pm-invites.service';

@Module({
  imports: [
    TypeOrmModule.forFeature([PmInviteEntity, DeveloperInviteEntity]),
    ProjectsModule,
  ],
  providers: [InvitesService, PmInvitesService, DeveloperInviteEntity],
})
export class InvitesModule {}
