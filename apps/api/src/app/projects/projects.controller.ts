import { Body, Controller, Post } from '@nestjs/common';
import { ProjectsService } from './projects.service';
import {
  CreateProjectContract,
} from '@taskfusion-microservices/contracts';

@Controller('projects')
export class ProjectsController {
  constructor(private readonly projectsService: ProjectsService) {}

  @Post('create-project')
  async createProject(
    @Body() dto: CreateProjectContract.Request
  ): Promise<CreateProjectContract.Response> {
    return this.projectsService.createProject(CreateProjectContract.exchange, CreateProjectContract.routingKey, dto);
  }
}
