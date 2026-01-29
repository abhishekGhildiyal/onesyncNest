import { forwardRef, Module } from '@nestjs/common';
import { DatabaseModule } from 'src/db/database.module';
import { ShopifyModule } from 'src/modules/shopify/shopify.module';
import { ConsumerInventoryHelperService } from './consumerInventory';
import { ManualOrderHelperService } from './create-manual-order.helper';
import { ReducePackageQuantity } from './reduce-package-qty.helper';
import { SaveOrderAsDraftHelper } from './save-order-as-draft.helper';
import { MarkInventorySold } from './sold-inventory.helper';

const helpers = [
  ManualOrderHelperService,
  ConsumerInventoryHelperService,
  ReducePackageQuantity,
  SaveOrderAsDraftHelper,
  MarkInventorySold,
];

@Module({
  imports: [DatabaseModule, forwardRef(() => ShopifyModule)],
  providers: [...helpers],
  exports: [...helpers],
})
export class HelpersModule {}
