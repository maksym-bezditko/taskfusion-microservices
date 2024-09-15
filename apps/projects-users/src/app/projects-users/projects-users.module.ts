import { Module } from '@nestjs/common';
import { ProjectsUsersService } from './projects-users.service';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ProjectsUsersEntity } from '@taskfusion-microservices/entities';

@Module({
  imports: [TypeOrmModule.forFeature([ProjectsUsersEntity])],
  providers: [ProjectsUsersService],
})
export class ProjectsUsersModule {}
