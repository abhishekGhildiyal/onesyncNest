import { Injectable, OnModuleDestroy } from '@nestjs/common';
import { JobsOptions, Queue } from 'bullmq';
import { RedisService } from 'src/services/redis/redis.service';
import type { InventoryBulkUpdateJobData } from './inventory-bulk-update.types';

const QUEUE_NAME = 'inventory-bulk-update';

@Injectable()
export class InventoryBulkUpdateQueueService implements OnModuleDestroy {
  private queue: Queue<InventoryBulkUpdateJobData> | null = null;

  constructor(private readonly redis: RedisService) {
    const connection = this.redis.getBullMqConnection();
    if (connection) {
      this.queue = new Queue<InventoryBulkUpdateJobData>(QUEUE_NAME, { connection });
    } else {
      console.warn('⚠️ Inventory bulk-update queue not initialized (Redis unavailable)');
    }
  }

  isEnabled(): boolean {
    return !!this.queue;
  }

  /**
   * One job per bulk-update API request (all targets in a single job).
   * Worker concurrency controls how many requests run in parallel across users.
   */
  async enqueueBulkUpdate(data: InventoryBulkUpdateJobData, opts: JobsOptions = {}) {
    if (!this.queue) {
      throw new Error('Inventory bulk-update queue not available');
    }

    const jobId =
      opts.jobId ?? `bulk-update-${data.storeId}-${data.userId}-${Date.now()}`;

    return this.queue.add('bulk-update', data, {
      jobId,
      attempts: 5,
      backoff: { type: 'exponential', delay: 3000 },
      removeOnComplete: { count: 200 },
      removeOnFail: { count: 500 },
      ...opts,
    });
  }

  async onModuleDestroy() {
    if (this.queue) {
      await this.queue.close();
      this.queue = null;
    }
  }
}
