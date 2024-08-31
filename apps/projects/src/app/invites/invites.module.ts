import { forwardRef, Module } from '@nestjs/common';
import { InvitesService } from './invites.service';
import { TypeOrmModule } from '@nestjs/typeorm';
import { PmInviteEntity, DeveloperInviteEntity } from '@taskfusion-microservices/entities';
import { AppModule } from '../app.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([PmInviteEntity, DeveloperInviteEntity]),
    forwardRef(() => AppModule),
  ],
  providers: [InvitesService],
})
export class InvitesModule {}
