import { BadRequestException, Injectable } from '@nestjs/common';
import { Op, Sequelize, Transaction } from 'sequelize';

import { PackageRepository } from 'src/db/repository/package.repository';
import { ProductRepository } from 'src/db/repository/product.repository';
import { StoreRepository } from 'src/db/repository/store.repository';
import { ShopifyService } from '../../modules/shopify/shopify.service';
import { ReducePackageQuantity } from './reduce-package-qty.helper';

@Injectable()
export class MarkInventorySold {
  constructor(
    private readonly storeRepo: StoreRepository,
    private readonly pkgRepo: PackageRepository,
    private readonly productRepo: ProductRepository,

    private readonly ReducePkgQtyHelper: ReducePackageQuantity,
  ) {}

  markSoldInventory = async (
    orderId: number,
    soldDate: Date,
    storeId: string | number,
    userId: string | number,
    roleId: string | number,
    token: string,
    transaction: Transaction,
    shopifyService: ShopifyService,
  ) => {
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
            variantEntries.push({
              size: String(qty.variant_size).trim(),
              selected_quantity: Number(qty.selectedCapacity) || 0,
              productId: item.products.product_id,
              productName: item.products.itemName,
              itemId: qty.item_id,
              sizeQtyId: qty.id,
              brandId: brand.brand_id,
              sellingPrice: Number(item.price) || 0, // 🟢 use item.price as sellingPrice
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
            [Op.and]: Sequelize.where(Sequelize.fn('TRIM', Sequelize.col('option1Value')), size),
          },
          order: [['id', 'ASC']],
          transaction,
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

          // AccountType 0
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
              { soldOn: soldDate, shopifyStatus: 'Sold' },
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

        const shopifyService = new ShopifyService(store);

        const inventoryItems = await this.productRepo.inventoryModel.findAll({
          where: { id: [...allSoldInventoryIds], storeId },
          attributes: ['id', 'shopifyId', 'productId'],
          transaction,
        });

        const validItems = inventoryItems.filter((i) => i.shopifyId);

        if (!validItems.length) {
          console.log('⚠️ No Shopify IDs found for deletion.');
          return;
        }
        const groupedByProduct = validItems.reduce((acc, item) => {
          if (!acc[item.productId]) acc[item.productId] = [];
          acc[item.productId].push(item.shopifyId);
          return acc;
        }, {});

        for (const [productId, shopifyIds] of Object.entries(groupedByProduct)) {
          console.log(
            `🧹 Deleting Shopify products for productId=${productId} (${(shopifyIds as string[]).length} IDs)`,
          );

          const deleteResults = await shopifyService.deleteItems(shopifyIds as string[], productId);

          const allDeletedOrNotFound = deleteResults.every((r) => r.success || r.message === 'Not found');

          const deletedCount = deleteResults.filter((r) => r.success).length;
          const notFoundCount = deleteResults.filter((r) => r.message === 'Not found').length;
          console.log(
            `🧾 Product ${productId}: Deleted=${deletedCount}, NotFound=${notFoundCount}, Total=${deleteResults.length}`,
          );

          // ✅ Cleanup web-scope items when all variants are gone
          /**if (allDeletedOrNotFound) {
                            console.log(`🌐 All variants gone — cleaning up web-scope for product ${productId}...`);
                            const webItems = await InventoryModel.findAll({
                                where: {
                                    productId,
                                    publishedScope: "web",
                                    storeId,
                                },
                                attributes: ["id", "shopifyId"],
                                transaction,
                            });

                            if (webItems.length > 0) {
                                const webIds = webItems.map((i) => i.id);

                                await InventoryModel.update({ status: 2, quantity: 0 }, { where: { id: webIds }, transaction });

                                await Promise.all(
                                    webItems.map(async (g) => {
                                        try {
                                            await shopifyService.client.delete({ path: `products/${g.shopifyId}` });
                                            console.log(`🗑️ Deleted web-scope Shopify product ID: ${g.shopifyId}`);
                                        } catch (err) {
                                            console.error(`⚠️ Failed to delete web-scope product ${g.shopifyId}:`, err.message);
                                        }
                                    })
                                );
                            } else {
                                console.log(`ℹ️ No web-scope items found for product ${productId}`);
                            }
                        } */

          // desync Web items
          // ✅ desync Web items
          // ✅ desync Web items - matching the CURL format
          if (allDeletedOrNotFound) {
            console.log(`🌐 All variants gone — cleaning up web-scope for product ${productId}...`);

            const webItems = await this.productRepo.inventoryModel.findAll({
              where: {
                productId,
                publishedScope: 'web',
                storeId,
              },
              attributes: ['id'],
              transaction,
            });

            if (!webItems.length) {
              console.log(`ℹ️ No web-scope items found for product ${productId}`);
              continue;
            }

            // ✅ EXACT curl format: array of ids
            const postData = webItems.map((i) => i.productId);

            const requestOptions: any = {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
                Accept: 'application/json',
                Authorization: token,
                roleId,
                userId,
                storeId,
              },
              body: JSON.stringify(postData),
            };

            try {
              console.log(`🌐 Desyncing web-scope items for product ${productId}...${store.store_domain}`);
              const syncResponse = await fetch(
                `https://onesync-api-50c03c74d4bf.herokuapp.com/${store.store_domain}/syncWebInventories`,
                requestOptions,
              );

              const syncResult = await syncResponse.json();

              console.log('✅ Web items sync result:', syncResult);
            } catch (err) {
              console.error('❌ Error syncing web items:', err.message);
            }
          }
        }

        console.log(`✅ Shopify cleanup completed for ${Object.keys(groupedByProduct).length} products`);
      }

      console.log(`🎯 SoldInventory complete for order ${orderId}`);
    } catch (err) {
      console.error('❌ Error in markSoldInventory', err);
      throw new BadRequestException(err.message);
    }
  };
}
