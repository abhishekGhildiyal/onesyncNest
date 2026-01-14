import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { Request } from 'express';
import { UserRepository } from 'src/db/repository/user.repository';

@Injectable()
export class VerifyTokenGuard implements CanActivate {
  constructor(private readonly userRepo: UserRepository) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<Request>();
    const authHeader =
      request.headers['authorization'] || request.headers['x-auth-token'];

    if (!authHeader) {
      throw new UnauthorizedException('Access denied. No token provided.');
    }

    const token =
      typeof authHeader === 'string' && authHeader.startsWith('Bearer ')
        ? authHeader.slice(7)
        : (authHeader as string);

    const tokenRecord = await this.userRepo.userLoginTokenModel.findOne({
      where: { token: token },
    });

    if (!tokenRecord) {
      throw new ForbiddenException({
        status: 403,
        message: 'Invalid or expired token.',
      });
    }

    // Attach authUser to request just like legacy
    (request as any).authUser = {
      userId: tokenRecord.userId,
      storeId: tokenRecord.storeId || null,
      token: tokenRecord.token,
    };

    return true;
  }
}
