import { Module } from '@nestjs/common';
import { SequelizeModule } from '@nestjs/sequelize';
import { Brand, ProductList, Variant, AccessPackageOrder, AccessPackageBrand, AccessPackageBrandItems, AccessPackageCustomer, AccessPackageBrandItemsQty, AccessPackageBrandItemsCapacity } from './entities';
import { ProductsService } from './products.service';
import { ProductsController } from './products.controller';

@Module({
  imports: [
    SequelizeModule.forFeature([
      Brand,
      ProductList,
      Variant,
      AccessPackageOrder,
      AccessPackageBrand,
      AccessPackageBrandItems,
      AccessPackageCustomer,
      AccessPackageBrandItemsQty,
      AccessPackageBrandItemsCapacity,
    ]),
  ],
  providers: [ProductsService],
  controllers: [ProductsController],
  exports: [ProductsService],
})
export class ProductsModule {}
