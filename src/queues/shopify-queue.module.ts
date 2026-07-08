import { Module } from '@nestjs/common';
import { RedisModule } from 'src/services/redis/redis.module';
import { InventoryBulkUpdateQueueService } from './inventory-bulk-update-queue.service';
import { InventoryBulkUpdateWorkerService } from './inventory-bulk-update-worker.service';
import { ShopifySyncQueueService } from './shopify-sync-queue.service';
import { ShopifySyncWorkerService } from './shopify-sync-worker.service';

@Module({
  imports: [RedisModule],
  providers: [
    ShopifySyncQueueService,
    ShopifySyncWorkerService,
    InventoryBulkUpdateQueueService,
    InventoryBulkUpdateWorkerService,
  ],
  exports: [ShopifySyncQueueService, InventoryBulkUpdateQueueService],
})
export class ShopifyQueueModule {}
