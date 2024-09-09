import { Controller, Get, Param, UseGuards } from '@nestjs/common';
import { AtJwtGuard } from '@taskfusion-microservices/common';
import { GetActionsByTaskIdContract } from '@taskfusion-microservices/contracts';
import { AmqpConnection } from '@golevelup/nestjs-rabbitmq';
import { handleRpcRequest } from '@taskfusion-microservices/helpers';

@Controller('actions')
export class ActionsController {
  constructor(
    private readonly amqpConnection: AmqpConnection
  ) {}

  @UseGuards(AtJwtGuard)
  @Get('get-actions-by-task-id/:taskId')
  async getActionsByTaskId(
    @Param('taskId') taskId: number
  ): Promise<GetActionsByTaskIdContract.Response> {
    const result =
      await this.amqpConnection.request<GetActionsByTaskIdContract.Response>({
        exchange: GetActionsByTaskIdContract.exchange,
        routingKey: GetActionsByTaskIdContract.routingKey,
        payload: {
          taskId,
        } as GetActionsByTaskIdContract.Dto,
      });

    return handleRpcRequest(result, async (response) => response);
  }
}
