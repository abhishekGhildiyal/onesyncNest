import { Injectable } from '@nestjs/common';
import { Op, Transaction } from 'sequelize';
import { VARIANT_STATUS } from 'src/common/constants/inventory-update-fields';
import { ProductRepository } from 'src/db/repository/product.repository';

const normalize = (val: unknown) => {
  if (val == null) return null;
  const trimmed = String(val).trim();
  return trimmed || null;
};

const firstNonNull = (...values: unknown[]) => {
  for (const v of values) {
    const n = normalize(v);
    if (n) return n;
  }
  return null;
};

@Injectable()
export class PersistShopifyVariantIdsHelper {
  constructor(private readonly productRepo: ProductRepository) {}

  async clearExistingWebVariantId(webVariantId: number, currentId: number, transaction?: Transaction) {
    await this.productRepo.variantModel.update(
      { webVariantId: null, webInventoryItemId: null },
      {
        where: {
          webVariantId,
          id: { [Op.ne]: currentId },
        },
        transaction,
      },
    );
  }

  async persistShopifyVariantIds({
    shopifyResult,
    localVariants,
    isWeb,
    transaction,
  }: {
    shopifyResult: any;
    localVariants: any[];
    isWeb: boolean;
    transaction?: Transaction;
  }) {
    const product = shopifyResult?.product;
    if (!product?.variants?.length || !localVariants?.length) return;

    const localMap = new Map<string, any>();
    for (const v of localVariants) {
      const plain = v?.get ? v.get({ plain: true }) : v;
      if (!plain || plain.status !== VARIANT_STATUS.ACTIVE) continue;

      const key = normalize(
        isWeb ? plain.web_barcode : firstNonNull(plain.migrationId, plain.barcode),
      );
      if (key && !localMap.has(key)) localMap.set(key, plain);
    }

    for (const sv of product.variants) {
      const barcode = normalize(sv.barcode);
      if (!barcode) continue;

      const local = localMap.get(barcode);
      if (!local?.id) continue;

      const shopifyVariantId = sv.id != null ? Number(sv.id) : null;
      const inventoryItemId = sv.inventory_item_id != null ? Number(sv.inventory_item_id) : null;

      if (!shopifyVariantId || !inventoryItemId) continue;

      if (isWeb) {
        await this.clearExistingWebVariantId(shopifyVariantId, local.id, transaction);
        await this.productRepo.variantModel.update(
          { webVariantId: shopifyVariantId, webInventoryItemId: inventoryItemId },
          { where: { id: local.id }, transaction },
        );
      } else {
        await this.productRepo.variantModel.update(
          { variant_id: shopifyVariantId, variant_inventory_id: String(inventoryItemId) },
          { where: { id: local.id }, transaction },
        );
      }
    }
  }
}
