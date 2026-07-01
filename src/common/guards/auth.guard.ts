import {
  BadRequestException,
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
  InternalServerErrorException,
  UnauthorizedException,
} from '@nestjs/common';
import { Request } from 'express';
import { UserRepository } from 'src/db/repository/user.repository';

type AuthUser = {
  userId: number;
  storeId: number | null;
  token: string;
};

@Injectable()
export class AuthGuard implements CanActivate {
  constructor(private readonly userRepo: UserRepository) {}

  private isOpenPath(requestURI: string): boolean {
    const openPaths = ['/auth/', '/webhook/', '/socket.io', '/stockx/'];
    return (
      openPaths.some((path) => requestURI.startsWith(path)) ||
      requestURI.includes('getAllTemplates') ||
      requestURI.includes('getAllLocation')
    );
  }

  private async verifyToken(request: Request): Promise<AuthUser> {
    const authHeader = request.headers['authorization'] || request.headers['x-auth-token'];

    if (!authHeader) {
      throw new UnauthorizedException('Access denied. No token provided.');
    }

    const token =
      typeof authHeader === 'string' && authHeader.startsWith('Bearer ')
        ? authHeader.slice(7)
        : (authHeader as string);

    const tokenRecord = await this.userRepo.userLoginTokenModel.findOne({
      where: { token },
    });

    if (!tokenRecord) {
      throw new ForbiddenException({
        status: 403,
        message: 'Invalid or expired token.',
      });
    }

    return {
      userId: tokenRecord.userId,
      storeId: tokenRecord.storeId || null,
      token: tokenRecord.token,
    };
  }

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<Request & { authUser?: AuthUser }>();
    const requestURI = request.originalUrl || request.url;

    if (this.isOpenPath(requestURI)) {
      return true;
    }

    let authUser = request.authUser;
    if (!authUser) {
      try {
        authUser = await this.verifyToken(request);
        request.authUser = authUser;
      } catch (err) {
        if (
          err instanceof UnauthorizedException ||
          err instanceof ForbiddenException ||
          err instanceof BadRequestException
        ) {
          throw err;
        }
        console.error('verifyToken error:', err);
        throw new InternalServerErrorException({
          message: 'Internal server error during token validation.',
        });
      }
    }

    const storeIdParam = request.headers['storeid'] || request.headers['storeId'];
    const roleIdParam = request.headers['roleid'] || request.headers['roleId'];

    let userId = authUser.userId;
    const token = authUser.token;

    if (userId == null) {
      console.error('[AUTH] userId missing from authUser');
      throw new BadRequestException({ message: 'Access denied. userId is required.' });
    }

    try {
      userId = parseInt(String(userId), 10);
      if (isNaN(userId)) {
        console.error('[AUTH] Invalid userId format');
        throw new BadRequestException({ message: 'Invalid userId format.' });
      }

      const userMappings = await this.userRepo.userStoreMappingModel.findAll({
        where: { userId, status: 1 },
        attributes: ['storeId', 'roleId', 'userId'],
        include: [
          {
            model: this.userRepo.userModel,
            as: 'user',
            attributes: ['id', 'email', 'firstName', 'lastName'],
          },
          {
            model: this.userRepo.roleModel,
            as: 'role',
            attributes: ['roleId', 'roleName'],
            include: [
              {
                model: this.userRepo.permissionModel,
                as: 'permissions',
                through: { attributes: [] } as any,
              },
            ],
          },
        ],
      });

      if (!userMappings?.length) {
        console.error('[AUTH] No mappings found for user');
        throw new ForbiddenException({
          status: 403,
          message: 'Access denied. User mapping not found.',
        });
      }

      const plainMappings = userMappings.map((mapping) => {
        const user = mapping.get('user');
        const role = mapping.get('role');
        return {
          userId: mapping.get('userId'),
          storeId: mapping.get('storeId'),
          roleId: mapping.get('roleId'),
          user: user ? user.get() : null,
          role: role ? role.get() : null,
        };
      });

      let selectedMapping: (typeof plainMappings)[0] | undefined;

      if (roleIdParam && storeIdParam) {
        const roleId = parseInt(String(roleIdParam), 10);
        const storeId = parseInt(String(storeIdParam), 10);
        if (!isNaN(roleId) && !isNaN(storeId)) {
          selectedMapping = plainMappings.find((m) => m.roleId === roleId && m.storeId === storeId);
        }
      }

      if (!selectedMapping && roleIdParam) {
        const roleId = parseInt(String(roleIdParam), 10);
        if (!isNaN(roleId)) {
          selectedMapping = plainMappings.find((m) => m.roleId === roleId);
        }
      }

      if (!selectedMapping && storeIdParam) {
        const storeId = parseInt(String(storeIdParam), 10);
        if (!isNaN(storeId)) {
          selectedMapping = plainMappings.find((m) => m.storeId === storeId);
        }
      }

      if (!selectedMapping) {
        selectedMapping =
          plainMappings.find((m) => m.role?.roleName === 'Consumer') || plainMappings[0];
      }

      const isConsumer = selectedMapping.role?.roleName === 'Consumer';

      if (!isConsumer) {
        if (!storeIdParam) {
          console.error('[AUTH] storeId header missing for non-consumer role');
          throw new BadRequestException({
            message: 'Access denied. storeId is required for this user role.',
          });
        }

        const storeId = parseInt(String(storeIdParam), 10);
        if (isNaN(storeId)) {
          console.error('[AUTH] Invalid storeId format');
          throw new BadRequestException({ message: 'Invalid storeId format.' });
        }

        if (selectedMapping.storeId !== storeId) {
          console.error('[AUTH] StoreId mismatch!');
          throw new ForbiddenException({
            status: 403,
            message: "Access denied. User doesn't have access to this store.",
          });
        }
      }

      const permissions =
        selectedMapping.role?.permissions?.map((p: any) =>
          typeof p === 'string' ? p : p?.name,
        ) || [];

      const resolvedUserId =
        selectedMapping.userId ?? selectedMapping.user?.id ?? userId;

      if (resolvedUserId !== selectedMapping.user?.id) {
        console.warn('[AUTH] userId resolved from mapping.userId', {
          tokenUserId: userId,
          mappingUserId: selectedMapping.userId,
          joinedUserId: selectedMapping.user?.id,
          resolvedUserId,
        });
      }

      (request as any).user = {
        userId: resolvedUserId,
        email: selectedMapping.user?.email,
        fullName: `${selectedMapping.user?.firstName ?? ''} ${selectedMapping.user?.lastName ?? ''}`.trim(),
        permissions,
        roleId: selectedMapping.roleId,
        roleName: selectedMapping.role?.roleName,
        storeId: selectedMapping.storeId,
        isConsumer,
        token,
      };

      return true;
    } catch (err) {
      if (
        err instanceof BadRequestException ||
        err instanceof ForbiddenException ||
        err instanceof UnauthorizedException
      ) {
        throw err;
      }
      console.error('Authentication error:', err);
      throw new InternalServerErrorException({
        message: 'Internal server error during authentication.',
      });
    }
  }
}
