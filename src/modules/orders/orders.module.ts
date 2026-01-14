import { Module } from '@nestjs/common';
import { ManualOrderHelperService } from 'src/common/helpers/create-manual-order.helper';
import { ReducePackageQuantity } from 'src/common/helpers/reduce-package-qty.helper';
import { MarkInventorySold } from 'src/common/helpers/sold-inventory.helper';
import { DatabaseModule } from 'src/db/database.module';
import { ShopifyModule } from '../shopify/shopify.module';
import { OrdersController } from './orders.controller';
import { OrdersService } from './orders.service';

@Module({
  imports: [ShopifyModule, DatabaseModule],
  providers: [
    OrdersService,
    ManualOrderHelperService,
    MarkInventorySold,
    ReducePackageQuantity,
  ],
  controllers: [OrdersController],
  exports: [OrdersService],
})
export class OrdersModule {}
