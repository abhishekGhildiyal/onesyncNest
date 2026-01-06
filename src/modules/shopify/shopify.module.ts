import { Module } from '@nestjs/common';
import { SequelizeModule } from '@nestjs/sequelize';
import { ShopifyService } from './shopify.service';
import { ShopifyController } from './shopify.controller';
import { Store } from '../users/entities';
import { Inventory } from '../inventory/entities';
import { ProductList, Variant } from '../products/entities';

@Module({
  imports: [
    SequelizeModule.forFeature([Store, Inventory, ProductList, Variant]),
  ],
  controllers: [ShopifyController],
  providers: [ShopifyService],
  exports: [ShopifyService],
})
export class ShopifyModule {}
