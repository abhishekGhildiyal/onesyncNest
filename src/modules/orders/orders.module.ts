import { Module } from '@nestjs/common';
import { SequelizeModule } from '@nestjs/sequelize';
import {
  PackageBrand,
  PackageBrandItems,
  PackageBrandItemsCapacity,
  PackageBrandItemsQty,
  PackageCustomer,
  PackageOrder,
  PackagePayment,
  PackageShipment,
} from '../packages/entities';
import {
  AccessPackageBrand,
  AccessPackageBrandItems,
  AccessPackageBrandItemsCapacity,
  AccessPackageBrandItemsQty,
  AccessPackageCustomer,
  AccessPackageOrder,
  Brand,
  ProductList,
  Variant,
} from '../products/entities';
import { ShopifyModule } from '../shopify/shopify.module';
import {
  ConsumerShippingAddress,
  Role,
  Store,
  User,
  UserStoreMapping,
} from '../users/entities';
import { OrdersController } from './orders.controller';
import { OrdersService } from './orders.service';

@Module({
  imports: [
    SequelizeModule.forFeature([
      PackageOrder,
      PackageBrand,
      PackageBrandItems,
      PackageCustomer,
      PackagePayment,
      PackageShipment,
      PackageBrandItemsQty,
      PackageBrandItemsCapacity,
      UserStoreMapping,
      AccessPackageOrder,
      AccessPackageCustomer,
      AccessPackageBrand,
      AccessPackageBrandItems,
      AccessPackageBrandItemsQty,
      AccessPackageBrandItemsCapacity,
      Brand,
      User,
      Role,
      ConsumerShippingAddress,
      Store,
      ProductList,
      Variant,
    ]),
    ShopifyModule,
  ],
  providers: [OrdersService],
  controllers: [OrdersController],
  exports: [OrdersService],
})
export class OrdersModule {}
