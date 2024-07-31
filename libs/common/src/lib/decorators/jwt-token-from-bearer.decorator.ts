import { ExecutionContext, createParamDecorator } from '@nestjs/common';

export const JwtTokenFromBearer = createParamDecorator(
  (_, ctx: ExecutionContext) => {
    const request = ctx.switchToHttp().getRequest();
    const authorization = request.headers['authorization'];
    
    return authorization?.replace('Bearer ', '') || null;
  }
);
