import { forwardRef, Module } from '@nestjs/common';
import { DatabaseModule } from 'src/db/database.module';
import { ShopifyQueueModule } from 'src/queues/shopify-queue.module';
import { ShopifyModule } from 'src/modules/shopify/shopify.module';
import { AddInventoryCtoSHelper } from './create-inventory/add-inventory-cto-s.helper';
import { BulkInventoryAddCoreHelper } from './create-inventory/bulk-inventory-add-core.helper';
import { BulkInventoryAddParityHelper } from './create-inventory/bulk-inventory-add-parity.helper';
import { CloudinaryService } from './create-inventory/cloudinary.service';
import { ConsumerInventoryHelperService } from './consumerInventory';
import { ManualOrderHelperService } from './create-manual-order.helper';
import { ReducePackageQuantity } from './reduce-package-qty.helper';
import { SaveOrderAsDraftHelper } from './save-order-as-draft.helper';
import { MarkInventorySold } from './sold-inventory.helper';
import { BarcodeGeneratorHelper } from './shared/barcode-generator.helper';
import { CustomFieldValueAuditHelper } from './shared/custom-field-value-audit.helper';
import { HandleMetaFieldsHelper } from './shared/handle-meta-fields.helper';
import { PersistShopifyVariantIdsHelper } from './shopify/persist-shopify-variant-ids.helper';
import { ShopifyInventorySyncHelper } from './shopify/shopify-inventory-sync.helper';
import { UniqueProductStoreShopifyHelper } from './shopify/unique-product-store-shopify.helper';
import { InventoryActivityLogHelper } from './update-inventory/inventory-activity-log.helper';
import { InventoryUpdateCoreHelper } from './update-inventory/inventory-update-core.helper';
import { InventoryUpdateParityHelper } from './update-inventory/inventory-update-parity.helper';
import { ShopifyOrderWebhookHelper } from './shopify-order-webhook.helper';

const helpers = [
  ManualOrderHelperService,
  ConsumerInventoryHelperService,
  ReducePackageQuantity,
  SaveOrderAsDraftHelper,
  MarkInventorySold,
  BarcodeGeneratorHelper,
  CustomFieldValueAuditHelper,
  HandleMetaFieldsHelper,
  CloudinaryService,
  BulkInventoryAddParityHelper,
  BulkInventoryAddCoreHelper,
  AddInventoryCtoSHelper,
  InventoryActivityLogHelper,
  InventoryUpdateParityHelper,
  InventoryUpdateCoreHelper,
  PersistShopifyVariantIdsHelper,
  UniqueProductStoreShopifyHelper,
  ShopifyInventorySyncHelper,
  ShopifyOrderWebhookHelper,
];

@Module({
  imports: [DatabaseModule, forwardRef(() => ShopifyModule), ShopifyQueueModule],
  providers: [...helpers],
  exports: [...helpers],
})
export class HelpersModule {}
