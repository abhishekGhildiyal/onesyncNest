import { Injectable, CanActivate, ExecutionContext, UnauthorizedException, ForbiddenException } from '@nestjs/common';
import { InjectModel } from '@nestjs/sequelize';
import { UserLoginToken } from '../../modules/onboarding/entities/user-login-token.entity';
import { Request } from 'express';

@Injectable()
export class VerifyTokenGuard implements CanActivate {
  constructor(
    @InjectModel(UserLoginToken)
    private readonly tokenModel: typeof UserLoginToken,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<Request>();
    const authHeader = request.headers['authorization'] || request.headers['x-auth-token'];

    if (!authHeader) {
      throw new UnauthorizedException('Access denied. No token provided.');
    }

    const token = typeof authHeader === 'string' && authHeader.startsWith('Bearer ') 
      ? authHeader.slice(7) 
      : (authHeader as string);

    const tokenRecord = await this.tokenModel.findOne({
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
