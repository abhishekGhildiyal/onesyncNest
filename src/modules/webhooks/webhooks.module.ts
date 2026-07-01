import { Module } from '@nestjs/common';
import { HelpersModule } from 'src/common/helpers/helpers.module';
import { DatabaseModule } from 'src/db/database.module';
import { ShopifyModule } from '../shopify/shopify.module';
import { ShopifyWebhookGuard } from './shopify-webhook.guard';
import { WebhooksController } from './webhooks.controller';
import { WebhooksService } from './webhooks.service';

@Module({
  imports: [DatabaseModule, HelpersModule, ShopifyModule],
  controllers: [WebhooksController],
  providers: [WebhooksService, ShopifyWebhookGuard],
})
export class WebhooksModule {}
