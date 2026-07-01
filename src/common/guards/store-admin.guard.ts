import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';

@Injectable()
export class StoreAdminGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    try {
      const user = context.switchToHttp().getRequest().user;

      if (!user) {
        throw new UnauthorizedException({
          success: false,
          message: 'Authentication required',
        });
      }

      const allowedRoles = ['ADMIN', 'Admin', 'admin', 'Super Admin'];
      if (!allowedRoles.includes(user.roleName)) {
        throw new ForbiddenException({
          success: false,
          message: 'Access denied. Admin role required.',
        });
      }

      return true;
    } catch (err) {
      if (err instanceof UnauthorizedException || err instanceof ForbiddenException) {
        throw err;
      }
      throw new ForbiddenException({
        success: false,
        message: 'Internal server error during store seller verification.',
      });
    }
  }
}
