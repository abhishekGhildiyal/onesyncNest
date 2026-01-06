import { Module, Global } from '@nestjs/common';
import { SequelizeModule } from '@nestjs/sequelize';
import { PackageOrder, PackageBrand, PackageBrandItems, PackageBrandItemsQty, PackageBrandItemsCapacity, PackageCustomer, PackagePayment, PackageShipment } from './entities';
import { Store, User, ConsumerShippingAddress, Role, UserStoreMapping } from '../users/entities';
import { ProductList, Variant, Brand } from '../products/entities';
import { StoreLocation, Invoice, Label, PrintTemplate } from '../store/entities';
import { Inventory, ConsumerInventory, ConsumerProductList, ConsumerProductVariant, ConsumerProductsMapping } from '../inventory/entities';
import { PackagesService } from './packages.service';
import { PackagesController } from './packages.controller';

@Global()
@Module({
  imports: [
    SequelizeModule.forFeature([
      PackageOrder,
      PackageBrand,
      PackageBrandItems,
      PackageBrandItemsQty,
      PackageBrandItemsCapacity,
      PackageCustomer,
      PackagePayment,
      PackageShipment,
      Store,
      User,
      ProductList,
      Variant,
      Brand,
      ConsumerShippingAddress,
      StoreLocation,
      Inventory,
      ConsumerInventory,
      ConsumerProductList,
      ConsumerProductVariant,
      ConsumerProductsMapping,
      Role,
      UserStoreMapping,
      Invoice,
      Label,
      PrintTemplate,
    ]),
  ],
  providers: [PackagesService],
  controllers: [PackagesController],
  exports: [PackagesService, SequelizeModule],
})
export class PackagesModule {}
