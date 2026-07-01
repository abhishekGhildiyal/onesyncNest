import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
  InternalServerErrorException,
  UnauthorizedException,
} from '@nestjs/common';

@Injectable()
export class ConsumerGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    try {
      const req = context.switchToHttp().getRequest();
      const user = req.user;

      if (!user) {
        throw new UnauthorizedException({
          success: false,
          message: 'Authentication required',
        });
      }

      if (!user.isConsumer) {
        throw new ForbiddenException({
          success: false,
          message: 'Access denied. Consumer role required',
        });
      }

      return true;
    } catch (err) {
      if (
        err instanceof UnauthorizedException ||
        err instanceof ForbiddenException
      ) {
        throw err;
      }
      console.error('Consumer check error:', err);
      throw new InternalServerErrorException({
        success: false,
        message: 'Internal server error during consumer verification',
      });
    }
  }
}
