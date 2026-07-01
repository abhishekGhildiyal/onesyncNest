import { Injectable } from '@nestjs/common';
import { Op } from 'sequelize';
import { TagSource, User } from 'src/db/entities';
import { ProductRepository } from 'src/db/repository/product.repository';
import { StoreRepository } from 'src/db/repository/store.repository';
import { ShopifySyncQueueService } from 'src/queues/shopify-sync-queue.service';
import { RedisService } from 'src/services/redis/redis.service';
import { ShopifyServiceFactory } from 'src/modules/shopify/shopify.service';
import { PersistShopifyVariantIdsHelper } from './persist-shopify-variant-ids.helper';
import { runStoreSync } from './store-sync';
import { UniqueProductStoreShopifyHelper } from './unique-product-store-shopify.helper';

const BULK_ITEM_THRESHOLD = 10;
const BULK_RETRY_DELAY_MS = 15000;
const NORMAL_RETRY_DELAY_MS = 30000;

@Injectable()
export class ShopifyInventorySyncHelper {
  constructor(
    private readonly productRepo: ProductRepository,
    private readonly storeRepo: StoreRepository,
    private readonly shopifyFactory: ShopifyServiceFactory,
    private readonly uniqueProduct: UniqueProductStoreShopifyHelper,
    private readonly persistVariantIds: PersistShopifyVariantIdsHelper,
    private readonly shopifyQueue: ShopifySyncQueueService,
    private readonly redis: RedisService,
  ) {}

  private async scheduleSyncRetry(
    productId: number,
    storeId: number,
    delayMs: number,
    bulkSync: boolean,
    useGraphql: boolean,
  ) {
    const retryJobId = `sync-retry-${productId}-${storeId}-${Date.now()}`;
    return this.shopifyQueue.add(
      retryJobId,
      { productId, storeId, bulkSync, useGraphql: !!useGraphql },
      {
        jobId: retryJobId,
        delay: delayMs,
        attempts: 5,
        backoff: { type: 'exponential', delay: 10000 },
        removeOnComplete: true,
      },
    );
  }

  private async loadTemplate(categoryId?: string | number | null) {
    if (!categoryId) return null;
    try {
      return await this.productRepo.templateModel.findByPk(categoryId);
    } catch {
      console.warn(`⚠️ [shopifyInventorySync] Invalid category ID: ${categoryId}`);
      return null;
    }
  }

  private async doSync(
    productId: number,
    storeId: number,
    options: {
      useGraphql?: boolean;
      bulkSync?: boolean;
      forceResync?: boolean;
      inventoryIds?: number[];
    } = {},
  ) {
    const useGraphql = options.useGraphql !== false;
    const apiLabel = useGraphql ? 'GraphQL' : 'REST';
    let syncedCount = 0;
    let failedCount = 0;
    const failedInventoryIds: number[] = [];
    const retryableInventoryIds: number[] = [];
    let itemsToSyncCount = 0;

    try {
      const store = await this.storeRepo.storeModel.findByPk(storeId);
      if (!store) {
        console.error(`❌ Store not found: ${storeId}`);
        return;
      }

      if (!store.shopify_store || !store.shopify_token) {
        console.log(`ℹ️ Shopify Sync disabled for store: ${store.store_name}`);
        return;
      }

      const inventoryIdFilter = options.inventoryIds?.length
        ? new Set(options.inventoryIds.map(Number))
        : null;

      let activeInventories = await this.productRepo.inventoryModel.findAll({
        where: { productId, storeId, soldOn: null, isVisible: true },
        include: [
          {
            model: this.productRepo.productListModel,
            as: 'productList',
            include: [{ model: TagSource, as: 'tags', through: { attributes: [] } }],
          },
          {
            model: this.productRepo.variantModel,
            as: 'variants',
            include: [{ model: User, as: 'user', required: false }],
          },
        ],
      });

      if (!activeInventories.length) {
        console.log(`⚠️ No active inventory for product ${productId}`);
        return;
      }

      const { inventories: preparedInventories, toSync: itemsToSync } =
        this.uniqueProduct.prepareUniqueProductSync(activeInventories, store, {
          inventoryIdFilter,
        });
      activeInventories = preparedInventories;

      if (itemsToSync.length === 0) {
        console.log(`ℹ️ All inventories for product ${productId} already synced.`);
        return;
      }

      itemsToSyncCount = itemsToSync.length;
      const bulkSync = !!options.bulkSync || itemsToSyncCount > BULK_ITEM_THRESHOLD;
      console.log(
        `[shopifyInventorySync] product ${productId}: starting sync for ${itemsToSyncCount} item(s) (${apiLabel}${bulkSync ? ', bulk' : ''})`,
      );

      const shopifyService = this.shopifyFactory.createService(store as any, { useGraphql });

      const productActiveVariants = await this.productRepo.variantModel.findAll({
        where: { productId, store_id: storeId, status: 1, quantity: { [Op.gt]: 0 } },
      });

      const result = await runStoreSync({
        store,
        productId,
        bulkSync,
        shopifyService,
        activeInventories,
        productActiveVariants,
        inventoryIdFilter,
        getVariantsForSync: (inv, s, opts) => this.uniqueProduct.getVariantsForSync(inv, s, opts),
        loadTemplate: (id) => this.loadTemplate(id),
        persistVariantIds: this.persistVariantIds,
      });

      syncedCount = result.syncedCount;
      if (result.failedInventoryIds?.length) {
        failedCount = result.failedInventoryIds.length;
        failedInventoryIds.push(...result.failedInventoryIds);
      }
      if (result.retryableInventoryIds?.length) {
        retryableInventoryIds.push(...result.retryableInventoryIds);
      }

      if (retryableInventoryIds.length > 0) {
        const retryDelayMs = bulkSync
          ? BULK_RETRY_DELAY_MS
          : Math.min(NORMAL_RETRY_DELAY_MS + retryableInventoryIds.length * 2000, 120000);
        await this.scheduleSyncRetry(productId, storeId, retryDelayMs, bulkSync, useGraphql);
        console.warn(
          `[shopifyInventorySync] product ${productId}: ${retryableInventoryIds.length} retryable failure(s), retry in ${retryDelayMs / 1000}s [${retryableInventoryIds.join(', ')}]`,
        );
      } else if (failedCount > 0) {
        console.warn(
          `[shopifyInventorySync] product ${productId}: ${failedCount} non-retryable failure(s) [${failedInventoryIds.join(', ')}]`,
        );
      }

      console.log(
        `[shopifyInventorySync] product ${productId}: done — ${syncedCount}/${itemsToSyncCount} synced${failedCount > 0 ? `, ${failedCount} failed` : ''}`,
      );
    } catch (err) {
      console.error(`❌ Fatal error in Shopify sync for product ${productId}:`, err);
      throw err;
    }
  }

  async shopifyInventorySync(
    productId: number,
    storeId: number,
    options: {
      useGraphql?: boolean;
      bulkSync?: boolean;
      forceResync?: boolean;
      inventoryIds?: number[];
      fromQueue?: boolean;
    } = {},
  ) {
    const redisClient = this.redis.getClient();
    if (!redisClient) {
      return this.doSync(productId, storeId, { ...options, useGraphql: options.useGraphql !== false });
    }

    const lockKey = `shopify_sync_lock:${productId}:${storeId}`;
    const lockValue = `${Date.now()}:${productId}`;
    const bulkSync = !!options.bulkSync;
    const TTL_SECONDS = bulkSync ? 1800 : 600;

    const locked = await redisClient.set(lockKey, lockValue, 'EX', TTL_SECONDS, 'NX');
    if (!locked) {
      console.log(`[shopifyInventorySync] product ${productId}: already syncing, skipped duplicate`);
      return;
    }

    const heartbeat = setInterval(async () => {
      const current = await redisClient.get(lockKey);
      if (current === lockValue) await redisClient.expire(lockKey, TTL_SECONDS);
    }, (TTL_SECONDS / 2) * 1000);

    try {
      await this.doSync(productId, storeId, { ...options, useGraphql: options.useGraphql !== false });
    } finally {
      clearInterval(heartbeat);
      const current = await redisClient.get(lockKey);
      if (current === lockValue) await redisClient.del(lockKey);
    }
  }

  async enqueueProductSync(
    productId: number,
    storeId: number,
    options: {
      bulkSync?: boolean;
      useGraphql?: boolean;
      forceResync?: boolean;
      inventoryIds?: number[];
    } = {},
  ) {
    if (!this.shopifyQueue.isEnabled()) {
      return this.shopifyInventorySync(productId, storeId, options);
    }
    return this.shopifyQueue.enqueueProductSync(productId, storeId, options);
  }
}
