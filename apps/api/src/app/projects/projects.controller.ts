import { Body, Controller, Post, UseGuards } from '@nestjs/common';
import { ProjectsService } from './projects.service';
import { CreateProjectContract } from '@taskfusion-microservices/contracts';
import { AtJwtGuard } from '@taskfusion-microservices/common';

@Controller('projects')
export class ProjectsController {
  constructor(private readonly projectsService: ProjectsService) {}

  @UseGuards(AtJwtGuard)
  @Post('create-project')
  async createProject(
    @Body() dto: CreateProjectContract.Request,
  ): Promise<CreateProjectContract.Response> {
    return this.projectsService.createProject(
      CreateProjectContract.exchange,
      CreateProjectContract.routingKey,
      dto
    );
  }
}
