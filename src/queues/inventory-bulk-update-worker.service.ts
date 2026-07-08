import { Injectable, Logger, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { ModuleRef } from '@nestjs/core';
import { Worker } from 'bullmq';
import { InventoryUpdateCoreHelper } from 'src/common/helpers/update-inventory/inventory-update-core.helper';
import { RedisService } from 'src/services/redis/redis.service';
import { processBulkUpdateJob } from './inventory-bulk-update.processor';
import type {
  InventoryBulkUpdateJobData,
  InventoryBulkUpdateJobResult,
} from './inventory-bulk-update.types';

const QUEUE_NAME = 'inventory-bulk-update';

/**
 * One bulk request at a time — finish all DB + Shopify for job N before job N+1 starts.
 * Override with INVENTORY_BULK_UPDATE_CONCURRENCY if you need more (not recommended).
 */
const JOB_CONCURRENCY = Number(process.env.INVENTORY_BULK_UPDATE_CONCURRENCY ?? 1);

@Injectable()
export class InventoryBulkUpdateWorkerService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(InventoryBulkUpdateWorkerService.name);
  private worker: Worker<InventoryBulkUpdateJobData, InventoryBulkUpdateJobResult> | null = null;

  constructor(
    private readonly redis: RedisService,
    private readonly moduleRef: ModuleRef,
  ) {}

  onModuleInit() {
    const connection = this.redis.getBullMqConnection();
    if (!connection) {
      this.logger.warn('Inventory bulk-update worker not started (Redis unavailable)');
      return;
    }

    this.worker = new Worker<InventoryBulkUpdateJobData, InventoryBulkUpdateJobResult>(
      QUEUE_NAME,
      async (job) => {
        const updateCore = this.moduleRef.get(InventoryUpdateCoreHelper, { strict: false });
        return processBulkUpdateJob(updateCore, job.data);
      },
      {
        connection,
        concurrency: JOB_CONCURRENCY,
        removeOnComplete: { count: 200 },
        removeOnFail: { count: 500 },
      },
    );

    this.worker.on('completed', (job, result) =>
      this.logger.log(
        `Bulk update job ${job.id} completed (${result?.processed ?? 0} items, ${result?.shopifyProducts ?? 0} Shopify products, ${result?.errors?.length ?? 0} errors)`,
      ),
    );
    this.worker.on('failed', (job, err) =>
      this.logger.error(`Bulk update job ${job?.id} failed: ${err.message}`),
    );

    this.logger.log(`Inventory bulk-update worker started (jobConcurrency=${JOB_CONCURRENCY})`);
  }

  async onModuleDestroy() {
    if (this.worker) {
      await this.worker.close();
      this.worker = null;
    }
  }
}
