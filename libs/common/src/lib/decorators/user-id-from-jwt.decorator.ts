import { ExecutionContext, createParamDecorator } from '@nestjs/common';

export const UserIdFromJwt = createParamDecorator(
  (_, ctx: ExecutionContext) => {
    const httpRequest = ctx.switchToHttp().getRequest();

    const user = httpRequest?.user;

    return +user.id;
  },
);