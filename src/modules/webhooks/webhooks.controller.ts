import { Body, Controller, Headers, Param, Post, Req, UseGuards } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import type { Request } from 'express';
import { ShopifyWebhookGuard } from './shopify-webhook.guard';
import { WebhooksService } from './webhooks.service';

@ApiTags('Webhooks')
@Controller('webhook')
export class WebhooksController {
  constructor(private readonly webhooksService: WebhooksService) {}

  @UseGuards(ShopifyWebhookGuard)
  @Post('shopify/order/:action')
  async shopifyWebhook(
    @Body() payload: any,
    @Param('action') _action: string,
    @Headers() headers: Record<string, string>,
    @Req() req: Request,
  ) {
    const normalizedHeaders = {
      'x-shopify-webhook-id': headers['x-shopify-webhook-id'] || req.get('X-Shopify-Webhook-Id'),
      'x-shopify-shop-domain': headers['x-shopify-shop-domain'] || req.get('X-Shopify-Shop-Domain'),
      'x-shopify-topic': headers['x-shopify-topic'] || req.get('X-Shopify-Topic'),
    };

    const result = await this.webhooksService.shopifyWebhook(payload, normalizedHeaders);
    return result.body;
  }
}
