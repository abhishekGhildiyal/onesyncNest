import { BadRequestException, CanActivate, ExecutionContext, ForbiddenException, Injectable } from '@nestjs/common';
import { Request } from 'express';
import { UserRepository } from 'src/db/repository/user.repository';

@Injectable()
export class AuthGuard implements CanActivate {
  constructor(private readonly userRepo: UserRepository) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<Request>();
    const requestURI = request.originalUrl;

    // 1️⃣ Skip permit-all paths
    const openPaths = ['/auth/', '/webhook/', '/socket.io', '/stockx/'];
    if (
      openPaths.some((path) => requestURI.startsWith(path)) ||
      requestURI.includes('getAllTemplates') ||
      requestURI.includes('getAllLocation')
    ) {
      return true;
    }

    // 2️⃣ Extract headers
    const userIdHeader = request.headers['userid'] || request.headers['userId'];
    const token = request.headers['authorization'];
    const storeIdHeader = request.headers['storeid'] || request.headers['storeId'];
    const roleIdHeader = request.headers['roleid'] || request.headers['roleId'];

    if (!userIdHeader) {
      console.error('[AUTH] Missing userId header');
      throw new BadRequestException({
        message: 'Access denied. userId is required.',
        success: false,
      });
    }

    const userId = parseInt(userIdHeader as string, 10);
    const storeId = storeIdHeader ? parseInt(storeIdHeader as string, 10) : null;
    const roleId = roleIdHeader ? parseInt(roleIdHeader as string, 10) : null;

    if (isNaN(userId)) {
      console.error('[AUTH] Invalid userId format:', userIdHeader);
      throw new BadRequestException({
        message: 'Invalid userId format.',
        success: false,
      });
    }

    // console.log('[AUTH] Headers:', { userId, storeId, roleId, token });

    // 3️⃣ Fetch user mappings from DB using get() method
    let userMappings: any;
    try {
      userMappings = await this.userRepo.userStoreMappingModel.findAll({
        where: { userId, status: 1 },
        include: [
          {
            model: this.userRepo.userModel,
            as: 'user',
            attributes: ['id', 'email', 'firstName', 'lastName'],
          },
          {
            model: this.userRepo.roleModel,
            as: 'role',
            attributes: ['roleId', 'roleName', 'storeId'],
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
    } catch (error) {
      console.error('[AUTH] Database error:', error);
      throw new ForbiddenException('Error fetching user data.');
    }

    if (!userMappings || !userMappings.length) {
      console.error('[AUTH] No user mappings found in DB for userId:', userId);
      throw new ForbiddenException('Access denied. User mapping not found.');
    }

    // 4️⃣ Convert to plain objects using get()
    const plainMappings = userMappings.map((mapping) => {
      // Use get() method to access data
      const user = mapping.get('user');
      const role = mapping.get('role');

      return {
        id: mapping.get('id'),
        userId: mapping.get('userId'),
        storeId: mapping.get('storeId'),
        roleId: mapping.get('roleId'),
        status: mapping.get('status'),
        user: user ? user.get() : null,
        role: role ? role.get() : null,
      };
    });

    // 5️⃣ Select mapping
    let selectedMapping;

    if (roleId !== null && storeId !== null) {
      selectedMapping = plainMappings.find((m) => m.roleId === roleId && Number(m.storeId) === storeId);
    }

    if (!selectedMapping && roleId !== null) {
      selectedMapping = plainMappings.find((m) => m.roleId === roleId);
    }

    if (!selectedMapping && storeId !== null) {
      selectedMapping = plainMappings.find((m) => Number(m.storeId) === storeId);
    }

    if (!selectedMapping) {
      selectedMapping = plainMappings.find((m) => m.role?.roleName === 'Consumer') || plainMappings[0];
    }

    if (!selectedMapping) {
      console.error('[AUTH] No valid mapping found');
      throw new ForbiddenException('Access denied. No valid user mapping found.');
    }

    // 6️⃣ Check if user exists, fetch separately if needed
    if (!selectedMapping.user) {
      const user = await this.userRepo.userModel.findByPk(userId, {
        attributes: ['id', 'email', 'firstName', 'lastName'],
      });

      if (!user) {
        console.error('[AUTH] User not found in database:', userId);
        throw new ForbiddenException('Access denied. User not found.');
      }

      selectedMapping.user = user.get();
    }

    const isConsumer = selectedMapping.role?.roleName === 'Consumer';

    // 7️⃣ Validate store access for non-consumer
    if (!isConsumer) {
      if (storeId === null) {
        console.error('[AUTH] Missing storeId header for non-consumer role');
        throw new BadRequestException({
          message: 'Access denied. storeId is required for this user role.',
          success: false,
        });
      }

      const mappingStoreId = Number(selectedMapping.storeId);

      if (mappingStoreId !== storeId) {
        console.error('[AUTH] StoreId mismatch!');
        throw new ForbiddenException("Access denied. User doesn't have access to this store.");
      }
    }

    // 8️⃣ Attach user object
    (request as any).user = {
      userId: selectedMapping.user.id,
      email: selectedMapping.user.email,
      fullName: `${selectedMapping.user.firstName ?? ''} ${selectedMapping.user.lastName ?? ''}`.trim(),
      permissions: selectedMapping.role?.permissions || [],
      roleId: selectedMapping.roleId,
      roleName: selectedMapping.role?.roleName,
      storeId: selectedMapping.storeId,
      isConsumer,
      token,
    };

    return true;
  }
}
