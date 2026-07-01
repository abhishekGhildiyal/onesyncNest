import { BadRequestException, Injectable } from '@nestjs/common';
import { Op, Sequelize, Transaction } from 'sequelize';

import { TagSource } from 'src/db/entities';
import { PackageRepository } from 'src/db/repository/package.repository';
import { ProductRepository } from 'src/db/repository/product.repository';
import { StoreRepository } from 'src/db/repository/store.repository';
import { buildShopifyPayload } from 'src/modules/shopify/shopify.helper';
import { ShopifyServiceFactory } from '../../modules/shopify/shopify.service';
import { PersistShopifyVariantIdsHelper } from './shopify/persist-shopify-variant-ids.helper';
import { ReducePackageQuantity } from './reduce-package-qty.helper';

@Injectable()
export class MarkInventorySold {
  constructor(
    private readonly storeRepo: StoreRepository,
    private readonly pkgRepo: PackageRepository,
    private readonly productRepo: ProductRepository,

    private readonly ReducePkgQtyHelper: ReducePackageQuantity,
    private readonly shopifyFactory: ShopifyServiceFactory,
    private readonly persistVariantIds: PersistShopifyVariantIdsHelper,
  ) {}

  markSoldInventory = async (
    orderId: number,
    soldDate: string | Date,
    storeId: string | number,
    userId: string | number,
    roleId: string | number,
    token: string,
    transaction: Transaction,
  ) => {
    const soldOn = soldDate instanceof Date ? soldDate : new Date(soldDate);
    try {
      const store = await this.storeRepo.storeModel.findByPk(storeId, {
        transaction,
      });
      if (!store) throw new Error(`Store ${storeId} not found`);

      console.log(`🚀 Starting SoldInventory for orderId=${orderId}`);

      // 1️⃣ Fetch all selected brand items & sizes
      const products = await this.pkgRepo.packageBrandModel.findAll({
        where: { package_id: orderId, selected: true },
        include: [
          {
            model: this.pkgRepo.packageBrandItemsModel,
            as: 'items',
            include: [
              {
                model: this.pkgRepo.packageBrandItemsQtyModel,
                as: 'sizeQuantities',
                where: { selectedCapacity: { [Op.gt]: 0 } },
                attributes: ['id', 'item_id', 'variant_size', 'selectedCapacity', 'maxCapacity'],
              },
              {
                model: this.productRepo.productListModel,
                as: 'products',
                required: false,
                attributes: ['product_id', 'itemName'],
              },
            ],
          },
        ],
        transaction,
      });

      if (!products?.length) {
        console.log('⚠️ No products found — nothing to update');
        return;
      }

      console.log(`📦 Found ${products.length} brands for package ${orderId}`);

      // 2️⃣ Flatten into variantEntries
      const variantEntries: any[] = [];
      for (const brand of products) {
        for (const item of (brand as any).items || []) {
          if (!item.products) continue;

          for (const qty of item.sizeQuantities || []) {
            const size = String(qty.variant_size).trim();

            // check active variant
            const activeVariant = await this.productRepo.variantModel.findOne({
              where: {
                productId: item.products.product_id,
                status: 1,
                quantity: { [Op.gt]: 0 },
                [Op.and]: Sequelize.where(Sequelize.fn('TRIM', Sequelize.col('option1value')), size),
              },
              transaction,
            });

            // ❌ no active variant → zero demand
            if (!activeVariant) {
              console.log(`⚠️ No active variant → zeroing demand | product=${item.products.product_id}, size=${size}`);

              // zero item demand
              await this.pkgRepo.packageBrandItemsModel.update(
                { consumerDemand: 0 },
                { where: { id: item.id }, transaction },
              );

              // zero selected capacity for this size
              await this.pkgRepo.packageBrandItemsQtyModel.update(
                { selectedCapacity: 0 },
                { where: { id: qty.id }, transaction },
              );
            }

            variantEntries.push({
              size: String(qty.variant_size).trim(),
              selected_quantity: Number(qty.selectedCapacity) || 0,
              productId: item.products.product_id,
              productName: item.products.itemName,
              itemId: qty.item_id,
              sizeQtyId: qty.id,
              brandId: brand.brand_id,
              sellingPrice: Number(item.price) || 0,
            });
          }
        }
      }

      if (!variantEntries.length) {
        console.log('⚠️ No variant entries — skipping.');
        return;
      }

      console.log(`🧩 Total variant entries: ${variantEntries.length}`);

      // 3️⃣ Group by productId + size, but keep brandIds separate
      const groups = new Map();
      for (const entry of variantEntries) {
        const key = `${entry.productId}||${entry.size}`;
        if (!groups.has(key)) {
          groups.set(key, {
            productId: entry.productId,
            size: entry.size,
            totalNeeded: 0,
            brandMap: new Map(),
          });
        }
        const g = groups.get(key);
        g.totalNeeded += entry.selected_quantity;
        g.brandMap.set(entry.brandId, (g.brandMap.get(entry.brandId) || 0) + entry.selected_quantity);
      }

      const allSoldInventoryIds = new Set();

      // 4️⃣ Process grouped variants
      for (const [_, group] of groups.entries()) {
        const { productId, size, totalNeeded, brandMap } = group;
        if (!size || !totalNeeded) continue;

        console.log(`\n🔹 Processing product=${productId}, size=${size}, totalNeeded=${totalNeeded}`);

        const variants = await this.productRepo.variantModel.findAll({
          where: {
            productId,
            status: 1,
            [Op.and]: Sequelize.where(Sequelize.fn('TRIM', Sequelize.col('option1value')), size),
          },
          order: [['id', 'ASC']],
          transaction,
          lock: transaction.LOCK.UPDATE,
          skipLocked: true, // 🔒 Skip already-locked rows
        });

        if (!variants?.length) {
          console.warn(`⚠️ No stock found for product ${productId} size ${size}`);
          continue;
        }

        let remaining = totalNeeded;
        for (const entry of variantEntries.filter((e) => e.productId === productId && e.size === size)) {
          if (remaining <= 0) break;

          const soldCount = Math.min(entry.selected_quantity, remaining);
          remaining -= soldCount;

          const variantsToSell = variants.splice(0, soldCount);
          const variantIds = variantsToSell.map((v) => v.id);
          const inventoryIds = [...new Set(variantsToSell.map((v) => v.inventoryId).filter(Boolean))];

          if (inventoryIds.length) {
            inventoryIds.forEach((id) => allSoldInventoryIds.add(id));
          }

          // 🟢 Update sold variants with correct price per entry
          // ✅ AccountType 1: price + payout = sellingPrice
          await this.productRepo.variantModel.update(
            {
              status: 2,
              quantity: 0,
              is_consumer_order: true,
              order_id: orderId,
              price: entry.sellingPrice,
              payout: entry.sellingPrice,
            },
            {
              where: { id: variantIds, accountType: 1 },
              transaction,
            },
          );

          // ✅ AccountType 0: price always, payout depends on store.is_discount
          const variantFee = variantsToSell[0]?.fee || 0;
          const payoutUpdate = store.is_discount
            ? undefined
            : Sequelize.literal(`${entry.sellingPrice} - (${entry.sellingPrice} * ${variantFee} / 100)`);

          await this.productRepo.variantModel.update(
            {
              status: 2,
              quantity: 0,
              is_consumer_order: true,
              price: entry.sellingPrice,
              order_id: orderId,
              ...(store.is_discount ? {} : { payout: payoutUpdate }),
            },
            {
              where: { id: variantIds, accountType: 0 },
              transaction,
            },
          );

          // 🟢 Update sold inventory records
          if (inventoryIds.length) {
            await this.productRepo.inventoryModel.update(
              { soldOn, shopifyStatus: 'Sold' },
              {
                where: {
                  id: inventoryIds,
                  [Op.or]: [{ shopifyStatus: null }, { shopifyStatus: { [Op.ne]: 'Sold' } }],
                },
                transaction,
              },
            );
          }

          console.log(
            `✅ Sold ${variantIds.length} variants for product ${productId}, size ${size}, price=${entry.sellingPrice}`,
          );
        }

        // 5️⃣ Sync brand quantities
        for (const [brandId, brandQty] of brandMap.entries()) {
          await this.ReducePkgQtyHelper.reduceSoldQuantityForPackages({
            productId,
            storeId,
            size,
            soldQty: brandQty,
            transaction,
            excludeOrderId: orderId,
            brandId,
          });
        }
      }

      // 6️⃣ Shopify Deletion & Cleanup
      if (allSoldInventoryIds.size > 0) {
        console.log(`🛍️ Preparing Shopify deletion for ${allSoldInventoryIds.size} sold inventory items...`);

        // Create Shopify service
        const shopifyService = this.shopifyFactory.createService({
          shopify_store: store.shopify_store,
          shopify_token: store.shopify_token,
          id: store.store_id,
          store_domain: store.store_domain,
          is_discount: store.is_discount,
        });

        const inventoryItems = await this.productRepo.inventoryModel.findAll({
          where: { id: [...allSoldInventoryIds], storeId },
          attributes: ['id', 'shopifyId', 'productId'],
          transaction,
          lock: transaction.LOCK.UPDATE,
        });

        const validItems = inventoryItems.filter((i) => i.shopifyId);
        if (!validItems.length) {
          console.log('⚠️ No Shopify IDs found for deletion.');
          return;
        }

        const groupedByProduct = validItems.reduce(
          (acc, item) => {
            if (!acc[item.productId]) acc[item.productId] = [];
            acc[item.productId].push(item.shopifyId);
            return acc;
          },
          {} as Record<number, string[]>,
        );

        for (const [productId, shopifyIds] of Object.entries(groupedByProduct)) {
          console.log(
            `🧹 Deleting Shopify products for productId=${productId} (${shopifyIds.length} IDs)`,
          );

          const deleteResults = await shopifyService.deleteItems(shopifyIds, Number(productId));

          const allDeletedOrNotFound = deleteResults.every(
            (r) => r.success || r.message === 'Not found',
          );

          if (allDeletedOrNotFound) {
            await this.productRepo.inventoryModel.update(
              { shopifyId: null, shopifyStatus: null },
              { where: { shopifyId: shopifyIds }, transaction },
            );
          }

          const deletedCount = deleteResults.filter((r) => r.success).length;
          const notFoundCount = deleteResults.filter((r) => r.message === 'Not found').length;
          console.log(
            `🧾 Product ${productId}: Deleted=${deletedCount}, NotFound=${notFoundCount}, Total=${deleteResults.length}`,
          );

          await new Promise((resolve) => setTimeout(resolve, 1200));
        }

        const allProductIds = Object.keys(groupedByProduct).map(Number);

        const activeVariantCounts = await this.productRepo.variantModel.findAll({
          attributes: ['productId'],
          where: {
            productId: allProductIds,
            status: 1,
            quantity: { [Op.gt]: 0 },
          },
          group: ['productId'],
          transaction,
        });

        const productsWithActiveVariants = new Set(activeVariantCounts.map((v) => v.productId));
        const productsToSync = allProductIds.filter((id) => !productsWithActiveVariants.has(id));

        if (productsToSync.length > 0) {
          try {
            console.log(
              `🌐 Bulk syncing web-scope items for ${productsToSync.length} products (0 active variants)... ${store.store_domain}`,
            );
            await this.syncWebInventories({ productIds: productsToSync, store, transaction });
            console.log('✅ Bulk web items sync completed locally');
          } catch (err: any) {
            console.error('❌ Error in bulk web items sync:', err.message);
          }
        }

        console.log(`✅ Shopify cleanup completed for ${Object.keys(groupedByProduct).length} products`);
      }

      console.log(`🎯 SoldInventory complete for order ${orderId}`);
    } catch (err) {
      console.error('❌ Error in markSoldInventory', err);
      throw new BadRequestException({ message: err.message, success: false });
    }
  };

  /** Sync web-scope inventories for a list of product IDs (background-safe). */
  async syncWebInventories(data: {
    productIds: number[];
    store: any;
    transaction?: Transaction;
  }) {
    const { productIds, store, transaction } = data;
    try {
      if (!store.shopify_store || !store.shopify_token) {
        console.log(`ℹ️ [syncWebInventories] Shopify Sync Is Disabled for store: ${store.store_name}`);
        return;
      }

      if (!productIds?.length) {
        console.log('⚠️ [syncWebInventories] No product IDs provided.');
        return;
      }

      console.log(`🚀 [syncWebInventories] Starting sync for product IDs: ${productIds}`);

      const webInventories = await this.productRepo.inventoryModel.findAll({
        where: {
          productId: productIds,
          publishedScope: 'web',
          storeId: store.store_id,
        },
        include: [
          {
            model: this.productRepo.productListModel,
            as: 'productList',
            include: [{ model: TagSource, as: 'tags', through: { attributes: [] } }],
          },
          {
            model: this.productRepo.variantModel,
            as: 'variants',
          },
        ],
        transaction,
      });

      if (!webInventories.length) {
        console.log('⚠️ [syncWebInventories] No web-scope items found.');
        return;
      }

      const shopifyService = this.shopifyFactory.createService(store, { useGraphql: true });

      for (const inventory of webInventories) {
        try {
          const inv = inventory as any;
          if (inv.productList?.isStoreOnly) {
            console.log(
              `ℹ️ [syncWebInventories] Skipping Shopify sync for store-only product. InventoryId=${inventory.id}`,
            );
            continue;
          }

          const activeVariants = await this.productRepo.variantModel.findAll({
            where: {
              productId: inventory.productId,
              store_id: store.store_id,
              status: 1,
              quantity: { [Op.gt]: 0 },
            },
            transaction,
          });

          if (activeVariants.length === 0) {
            if (inventory.shopifyId) {
              console.log(
                `🧹 [syncWebInventories] Deleting Shopify product ${inventory.shopifyId} (no active variants)`,
              );
              await shopifyService.deleteItems([inventory.shopifyId], inventory.productId);
              await inventory.update({ shopifyId: null, shopifyStatus: null }, { transaction });
            }
            continue;
          }

          if (inventory.shopifyId) {
            console.log(`ℹ️ [syncWebInventories] Skipping already synced inventory: ${inventory.id}`);
            continue;
          }

          console.log(`🌐 [syncWebInventories] SYNCING NEW PRODUCT → inventoryId=${inventory.id}`);

          let template: any = null;
          if (inventory.category) {
            template = await this.productRepo.templateModel.findByPk(inventory.category, { transaction });
          }

          const payload = buildShopifyPayload(inventory, activeVariants, store, template);
          const result = await shopifyService.syncProduct(payload);

          if (result?.product?.id) {
            await inventory.update(
              {
                shopifyId: String(result.product.id),
                shopifyStatus: 'Listed',
              },
              { transaction },
            );

            await this.persistVariantIds.persistShopifyVariantIds({
              shopifyResult: result,
              localVariants: activeVariants,
              isWeb: true,
              transaction,
            });

            console.log(`✅ [syncWebInventories] Synced inventory ${inventory.id} -> Shopify ${result.product.id}`);
          }
        } catch (err: any) {
          console.error(`❌ [syncWebInventories] Error syncing inventory ${inventory.id}:`, err.message);
        }

        await new Promise((resolve) => setTimeout(resolve, 1500));
      }
    } catch (err: any) {
      console.error('❌ [syncWebInventories] Fatal error:', err.message);
    }
  };
}
