import { Controller, Get, Param, UseGuards } from '@nestjs/common';
import {
  AtJwtGuard,
  CustomAmqpConnection,
} from '@taskfusion-microservices/common';
import { GetActionsByTaskIdContract } from '@taskfusion-microservices/contracts';

@Controller('actions')
export class ActionsController {
  constructor(private readonly customAmqpConnection: CustomAmqpConnection) {}

  @UseGuards(AtJwtGuard)
  @Get('get-actions-by-task-id/:taskId')
  async getActionsByTaskId(
    @Param('taskId') taskId: number
  ): Promise<GetActionsByTaskIdContract.Response> {
    const payload: GetActionsByTaskIdContract.Dto = {
      taskId,
    };

    return this.customAmqpConnection.requestOrThrow<GetActionsByTaskIdContract.Response>(
      GetActionsByTaskIdContract.routingKey,
      payload
    );
  }
}
