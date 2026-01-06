import { Injectable, CanActivate, ExecutionContext, UnauthorizedException, ForbiddenException, SetMetadata } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { InjectModel } from '@nestjs/sequelize';
import { UserStoreMapping } from '../../modules/users/entities/user-store-mapping.entity';
import { ROLES } from '../constants/permissions';

export const AgentType = (type: 'is_sales_agent' | 'is_logistic_agent', allowAdmin = false) =>
  SetMetadata('agent_check', { type, allowAdmin });

@Injectable()
export class AgentGuard implements CanActivate {
  constructor(
    private reflector: Reflector,
    @InjectModel(UserStoreMapping) private userStoreMapping: typeof UserStoreMapping,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const check = this.reflector.get<{ type: string; allowAdmin: boolean }>('agent_check', context.getHandler());
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

    const userMap = await this.userStoreMapping.findOne({
      where: {
        userId: user.userId,
        storeId: user.storeId,
        [check.type]: true,
      },
    });

    if (!userMap) {
      const typeLabel = check.type === 'is_sales_agent' ? 'store sales agent' : 'store logistic agent';
      throw new ForbiddenException(`Access denied. User is not a ${typeLabel}.`);
    }

    return true;
  }
}
