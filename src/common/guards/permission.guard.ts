import {
  Injectable,
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  UnauthorizedException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { PERMISSIONS_KEY } from '../decorators/permission.decorator';

@Injectable()
export class PermissionGuard implements CanActivate {
  constructor(private reflector: Reflector) {}

  private normalizePermission(p: any): string | null {
    if (typeof p === 'string') return p;
    if (typeof p === 'number') return String(p);
    if (typeof p === 'object' && p?.name) return p.name;
    return null;
  }

  canActivate(context: ExecutionContext): boolean {
    const requiredPermissions =
      this.reflector.getAllAndOverride<any[]>(PERMISSIONS_KEY, [
        context.getHandler(),
        context.getClass(),
      ]);

    // No permissions required → allow
    if (!requiredPermissions || requiredPermissions.length === 0) {
      return true;
    }

    const request = context.switchToHttp().getRequest();
    const user = request.user;

    if (!user) {
      throw new UnauthorizedException('User not authenticated');
    }

    const userPermissions = (user.permissions || [])
      .map((p: any) => this.normalizePermission(p))
      .filter(Boolean);

    const required = requiredPermissions
      .map((p: any) => this.normalizePermission(p))
      .filter(Boolean);

    // ---- ANY permission match (default behavior)
    const hasAny = required.some((r) => userPermissions.includes(r));

    if (!hasAny) {
      throw new ForbiddenException(
        `Access denied. Required permission: ${required.join(' OR ')}`,
      );
    }

    return true;
  }
}
