import { Controller, Get, Param, UseGuards } from '@nestjs/common';
import { ActionsService } from './actions.service';
import { AtJwtGuard } from '@taskfusion-microservices/common';
import { GetActionsByTaskIdContract } from '@taskfusion-microservices/contracts';

@Controller('actions')
export class ActionsController {
  constructor(private readonly actionsService: ActionsService) {}

  @UseGuards(AtJwtGuard)
  @Get('get-actions-by-task-id/:taskId')
  async getActionsByTaskId(
    @Param('taskId') taskId: number
  ): Promise<GetActionsByTaskIdContract.Response> {
    return this.actionsService.getActionsByTaskId(
      GetActionsByTaskIdContract.exchange,
      GetActionsByTaskIdContract.routingKey,
      {
        taskId,
      }
    );
  }
}
