import { Injectable } from '@nestjs/common';
import {
  Authenticate,
  Customers,
  Permission,
  RecipientDetails,
  Role,
  RolePermission,
  User,
  UserLoginToken,
  UserStoreMapping,
} from '../entities';

@Injectable()
export class UserRepository {
  constructor(
    public readonly userModel: typeof User,
    public readonly roleModel: typeof Role,
    public readonly permissionModel: typeof Permission,
    public readonly rolePermissionMappingModel: typeof RolePermission,
    public readonly customerModel: typeof Customers,
    public readonly userStoreMappingModel: typeof UserStoreMapping,

    public readonly authenticationModel: typeof Authenticate,
    public readonly userLoginTokenModel: typeof UserLoginToken,

    public readonly recipientDetailsModel: typeof RecipientDetails,
  ) {}
}
