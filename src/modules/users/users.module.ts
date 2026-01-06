import { Module } from '@nestjs/common';
import { SequelizeModule } from '@nestjs/sequelize';
import {
  PackageBrand,
  PackageBrandItems,
  PackageCustomer,
  PackageOrder,
} from '../packages/entities';
import {
  ConsumerShippingAddress,
  Permission,
  Role,
  Store,
  User,
  UserStoreMapping,
} from './entities';
import { RolePermission } from './entities/role-permission.entity';
import { UsersController } from './users.controller';
import { UsersService } from './users.service';

@Module({
  imports: [
    SequelizeModule.forFeature([
      User,
      ConsumerShippingAddress,
      Role,
      Permission,
      RolePermission,
      Store,
      UserStoreMapping,
      PackageOrder,
      PackageCustomer,
      PackageBrand,
      PackageBrandItems,
    ]),
  ],
  providers: [UsersService],
  controllers: [UsersController],
  exports: [UsersService],
})
export class UsersModule {}
