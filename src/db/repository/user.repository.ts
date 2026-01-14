import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/sequelize';
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
    @InjectModel(User)
    public readonly userModel: typeof User,
    @InjectModel(Role)
    public readonly roleModel: typeof Role,
    @InjectModel(Permission)
    public readonly permissionModel: typeof Permission,
    @InjectModel(RolePermission)
    public readonly rolePermissionMappingModel: typeof RolePermission,
    @InjectModel(Customers)
    public readonly customerModel: typeof Customers,
    @InjectModel(UserStoreMapping)
    public readonly userStoreMappingModel: typeof UserStoreMapping,

    @InjectModel(Authenticate)
    public readonly authenticationModel: typeof Authenticate,
    @InjectModel(UserLoginToken)
    public readonly userLoginTokenModel: typeof UserLoginToken,

    @InjectModel(RecipientDetails)
    public readonly recipientDetailsModel: typeof RecipientDetails,
  ) {}
}
