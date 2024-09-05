import { Module } from '@nestjs/common';
import { ProjectsService } from './projects.service';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ProjectEntity } from '@taskfusion-microservices/entities';

@Module({
  imports: [TypeOrmModule.forFeature([ProjectEntity])],
  providers: [ProjectsService],
  exports: [ProjectsService],
})
export class ProjectsModule {}
