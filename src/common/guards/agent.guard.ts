import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { UserRepository } from 'src/db/repository/user.repository';
import { ROLES } from '../constants/permissions';
import { AGENT_CHECK_KEY } from '../decorators/agent-type.decorator';

@Injectable()
export class AgentGuard implements CanActivate {
  constructor(
    private readonly reflector: Reflector,
    private readonly userRepo: UserRepository,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const check = this.reflector.get<{
      type: string;
      allowAdmin: boolean;
    }>(AGENT_CHECK_KEY, context.getHandler());

    if (!check) return true;

    const req = context.switchToHttp().getRequest();
    const user = req.user;

    if (!user) {
      throw new UnauthorizedException('Authentication required.');
    }

    if (check.allowAdmin) {
      const allowedRoles = [ROLES.ADMIN, ROLES.SUPER_ADMIN, 'Admin', 'admin'];
      if (allowedRoles.includes(user.roleName)) {
        return true;
      }
    }

    const userMap = await this.userRepo.userStoreMappingModel.findOne({
      where: {
        userId: user.userId,
        storeId: user.storeId,
        [check.type]: true,
      },
    });

    if (!userMap) {
      const typeLabel =
        check.type === 'is_sales_agent'
          ? 'store sales agent'
          : 'store logistic agent';

      throw new ForbiddenException(
        `Access denied. User is not a ${typeLabel}.`,
      );
    }

    return true;
  }
}
