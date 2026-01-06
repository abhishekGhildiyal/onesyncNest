import { Module } from '@nestjs/common';
import { SequelizeModule } from '@nestjs/sequelize';
import { Inventory, InventoryRequest, ConsumerInventory, ConsumerProductList, ConsumerProductVariant, ConsumerProductsMapping } from './entities';
import { InventoryService } from './inventory.service';
import { InventoryController } from './inventory.controller';
import { ProductList, Variant, Brand } from '../products/entities';

@Module({
  imports: [
    SequelizeModule.forFeature([
      Inventory,
      InventoryRequest,
      ConsumerInventory,
      ConsumerProductList,
      ConsumerProductVariant,
      ConsumerProductsMapping,
      ProductList,
      Variant,
      Brand,
    ]),
  ],
  providers: [InventoryService],
  controllers: [InventoryController],
  exports: [SequelizeModule, InventoryService],
})
export class InventoryModule {}
