import { Injectable, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { ModuleRef } from '@nestjs/core';
import { Worker } from 'bullmq';
import { ShopifyInventorySyncHelper } from 'src/common/helpers/shopify/shopify-inventory-sync.helper';
import { RedisService } from 'src/services/redis/redis.service';

@Injectable()
export class ShopifySyncWorkerService implements OnModuleInit, OnModuleDestroy {
  private worker: Worker | null = null;

  constructor(
    private readonly redis: RedisService,
    private readonly moduleRef: ModuleRef,
  ) {}

  onModuleInit() {
    const connection = this.redis.getBullMqConnection();
    if (!connection) {
      console.warn('⚠️ Shopify sync worker not started (Redis unavailable)');
      return;
    }

    this.worker = new Worker(
      'shopify-sync',
      async (job) => {
        const shopifySync = this.moduleRef.get(ShopifyInventorySyncHelper, { strict: false });
        const { productId, storeId, bulkSync, forceResync, inventoryIds, useGraphql } = job.data;
        await shopifySync.shopifyInventorySync(productId, storeId, {
          bulkSync: !!bulkSync,
          useGraphql: useGraphql !== false,
          forceResync: !!forceResync,
          inventoryIds: Array.isArray(inventoryIds) ? inventoryIds : undefined,
          fromQueue: true,
        });
      },
      {
        connection,
        concurrency: 1,
        removeOnComplete: { count: 100 },
        removeOnFail: { count: 500 },
      },
    );

    this.worker.on('completed', (job) => console.log(`✅ Shopify sync job ${job.id} completed`));
    this.worker.on('failed', (job, err) => console.error(`❌ Job ${job?.id} failed:`, err.message));
  }

  async onModuleDestroy() {
    if (this.worker) {
      await this.worker.close();
      this.worker = null;
    }
  }
}
