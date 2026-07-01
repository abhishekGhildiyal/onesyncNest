import { Injectable, Logger, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import Redis, { RedisOptions } from 'ioredis';

@Injectable()
export class RedisService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(RedisService.name);
  private client: Redis | null = null;

  onModuleInit() {
    const redisUrl = process.env.REDIS_URL;
    if (!redisUrl) {
      this.logger.warn('REDIS_URL not set — Redis/BullMQ features disabled');
      return;
    }

    const options: RedisOptions = {
      maxRetriesPerRequest: null,
      enableReadyCheck: false,
      retryStrategy: (times) => Math.min(times * 50, 2000),
    };

    if (redisUrl.startsWith('rediss://')) {
      options.tls = { rejectUnauthorized: false };
    }

    this.client = new Redis(redisUrl, options);
    this.client.on('connect', () => this.logger.log('Redis connected'));
    this.client.on('error', (err) => this.logger.error('Redis error:', err.message));
  }

  async onModuleDestroy() {
    if (this.client) {
      await this.client.quit();
      this.client = null;
    }
  }

  isEnabled(): boolean {
    return !!this.client;
  }

  getClient(): Redis | null {
    return this.client;
  }

  /** BullMQ connection options (separate from app Redis client to avoid ioredis version conflicts). */
  getBullMqConnection(): Record<string, unknown> | null {
    const redisUrl = process.env.REDIS_URL;
    if (!redisUrl) return null;

    const connection: Record<string, unknown> = {
      url: redisUrl,
      maxRetriesPerRequest: null,
      enableReadyCheck: false,
    };

    if (redisUrl.startsWith('rediss://')) {
      connection.tls = { rejectUnauthorized: false };
    }

    return connection;
  }
}
