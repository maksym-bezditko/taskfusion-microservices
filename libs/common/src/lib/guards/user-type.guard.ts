import { Injectable, CanActivate, ExecutionContext, UnauthorizedException } from '@nestjs/common';
import { Observable } from 'rxjs';
import { UserType } from '@taskfusion-microservices/entities';

@Injectable()
export class UserTypeGuard implements CanActivate {
  constructor(private readonly requiredUserType?: UserType) {}

  canActivate(
    context: ExecutionContext,
  ): boolean | Promise<boolean> | Observable<boolean> {
    const request = context.switchToHttp().getRequest();
    const user = request.user;

    if (!user) {
      throw new UnauthorizedException('User not authenticated');
    }

    if (this.requiredUserType && user.userType !== this.requiredUserType) {
      throw new UnauthorizedException(`User type ${user.userType} is not allowed`);
    }

    return true;
  }
}