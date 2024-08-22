import { forwardRef, Module } from '@nestjs/common';
import { InvitesService } from './invites.service';
import { TypeOrmModule } from '@nestjs/typeorm';
import { InviteEntity } from '@taskfusion-microservices/entities';
import { AppModule } from '../app.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([InviteEntity]),
    forwardRef(() => AppModule),
  ],
  providers: [InvitesService],
})
export class InvitesModule {}
