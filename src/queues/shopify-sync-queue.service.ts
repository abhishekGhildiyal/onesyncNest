import { Injectable, OnModuleDestroy } from '@nestjs/common';
import { JobsOptions, Queue } from 'bullmq';
import { RedisService } from 'src/services/redis/redis.service';
import type { ShopifySyncJobData } from './shopify-sync.types';

@Injectable()
export class ShopifySyncQueueService implements OnModuleDestroy {
  private queue: Queue | null = null;

  constructor(private readonly redis: RedisService) {
    const connection = this.redis.getBullMqConnection();
    if (connection) {
      this.queue = new Queue('shopify-sync', { connection });
    } else {
      console.warn('⚠️ Shopify sync queue not initialized (Redis unavailable)');
    }
  }

  isEnabled(): boolean {
    return !!this.queue;
  }

  async add(name: string, data: ShopifySyncJobData, opts?: JobsOptions) {
    if (!this.queue) {
      throw new Error('Shopify sync queue not available');
    }
    return this.queue.add(name, data, opts);
  }

  /** Matches Express `shopifySyncQueue.add` for product sync jobs. */
  async enqueueProductSync(
    productId: number,
    storeId: number,
    options: {
      bulkSync?: boolean;
      useGraphql?: boolean;
      forceResync?: boolean;
      inventoryIds?: number[];
      jobId?: string;
    } = {},
  ) {
    if (!this.queue) return null;

    const jobId = options.jobId ?? `sync-${productId}-${storeId}`;
    return this.queue.add(
      jobId,
      {
        productId,
        storeId,
        bulkSync: !!options.bulkSync,
        useGraphql: options.useGraphql !== false,
        forceResync: !!options.forceResync,
        inventoryIds: options.inventoryIds,
      },
      {
        jobId,
        attempts: 5,
        backoff: { type: 'exponential', delay: 5000 },
        removeOnComplete: true,
      },
    );
  }

  async onModuleDestroy() {
    if (this.queue) {
      await this.queue.close();
      this.queue = null;
    }
  }
}
