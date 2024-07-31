import { ExecutionContext, Injectable } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';

@Injectable()
export class AtJwtGuard extends AuthGuard('jwt-at') {
  override getRequest(context: ExecutionContext) {
    return context.switchToHttp().getRequest();
  }
}
