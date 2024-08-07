import { Body, Controller, Get, Param, Post, UseGuards } from '@nestjs/common';
import { ProjectsService } from './projects.service';
import {
  CreateProjectContract,
  GetProjectByIdContract,
  GetProjectsContract,
} from '@taskfusion-microservices/contracts';
import { AtJwtGuard, UserIdFromJwt } from '@taskfusion-microservices/common';

@Controller('projects')
export class ProjectsController {
  constructor(private readonly projectsService: ProjectsService) {}

  @UseGuards(AtJwtGuard)
  @Post('create-project')
  async createProject(
    @Body() dto: CreateProjectContract.Request
  ): Promise<CreateProjectContract.Response> {
    return this.projectsService.createProject(
      CreateProjectContract.exchange,
      CreateProjectContract.routingKey,
      dto
    );
  }

  @UseGuards(AtJwtGuard)
  @Get()
  async getProjects(
    @UserIdFromJwt() userId: number
  ): Promise<GetProjectsContract.Response> {
    return this.projectsService.getProjects(
      GetProjectsContract.exchange,
      GetProjectsContract.routingKey,
      {
        userId,
      }
    );
  }

  @UseGuards(AtJwtGuard)
  @Get(':id')
  async getProjectById(
    @UserIdFromJwt() userId: number,
    @Param('id') id: number
  ): Promise<GetProjectByIdContract.Response> {
    return this.projectsService.getProjectById(
      GetProjectByIdContract.exchange,
      GetProjectByIdContract.routingKey,
      {
        userId,
        projectId: id,
      }
    );
  }
}
