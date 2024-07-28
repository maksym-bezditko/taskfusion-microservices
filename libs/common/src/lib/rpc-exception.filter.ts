import { Catch, HttpException, ExceptionFilter } from '@nestjs/common';

@Catch()
export class RpcExceptionsFilter implements ExceptionFilter {
  catch(exception: Error) {
    const status =
      exception instanceof HttpException ? exception.getStatus() : 500;
    const message = exception || 'Internal server error';

    return {
      status,
      error: {
        message,
      },
    };
  }
}
