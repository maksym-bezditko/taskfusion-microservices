import { HttpException } from '@nestjs/common';
import { isError } from '@taskfusion-microservices/types';

export const handleRpcRequest = async <Result, Response = unknown>(
  result: Result,
  handler: (request: Result) => Promise<Response>
): Promise<Response | undefined> => {
  if (isError(result)) {
    throw new HttpException(
      result?.error || 'Internal server error',
      result?.status || 500
    );
  }

  return handler?.(result) as Promise<Response>;
};
