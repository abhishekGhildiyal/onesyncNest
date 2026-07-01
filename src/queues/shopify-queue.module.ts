import { Module } from '@nestjs/common';
import { RedisModule } from 'src/services/redis/redis.module';
import { ShopifySyncQueueService } from './shopify-sync-queue.service';
import { ShopifySyncWorkerService } from './shopify-sync-worker.service';

@Module({
  imports: [RedisModule],
  providers: [ShopifySyncQueueService, ShopifySyncWorkerService],
  exports: [ShopifySyncQueueService],
})
export class ShopifyQueueModule {}
