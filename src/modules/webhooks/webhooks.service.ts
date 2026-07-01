import { Injectable } from '@nestjs/common';
import { Op } from 'sequelize';
import { ShopifyOrderWebhookHelper } from 'src/common/helpers/shopify-order-webhook.helper';
import { OrderRepository } from 'src/db/repository/order.repository';
import { StoreRepository } from 'src/db/repository/store.repository';

const normalizeShopDomain = (domain = '') => domain.trim().toLowerCase().replace(/^https?:\/\//, '');

@Injectable()
export class WebhooksService {
  constructor(
    private readonly storeRepo: StoreRepository,
    private readonly orderRepo: OrderRepository,
    private readonly shopifyOrderWebhookHelper: ShopifyOrderWebhookHelper,
  ) {}

  private async resolveStore(shopDomain?: string) {
    if (!shopDomain) return null;
    const normalized = normalizeShopDomain(shopDomain);
    const storeName = normalized.replace(/\.myshopify\.com$/, '');
    return this.storeRepo.storeModel.findOne({
      where: {
        [Op.or]: [
          { shopify_store: normalized },
          { shopify_store: storeName },
          { shopify_store: `${storeName}.myshopify.com` },
        ],
      },
    });
  }

  async shopifyWebhook(payload: any, headers: Record<string, string | undefined>) {
    const webhookId = headers['x-shopify-webhook-id'];
    const shopDomain = headers['x-shopify-shop-domain'];
    const topic = headers['x-shopify-topic'];

    console.log('[shopifyWebhook]', { webhookId, shopDomain, topic, orderId: payload?.id });

    if (topic !== 'orders/create' && topic !== 'orders/cancelled') {
      return { status: 200, body: { success: true, message: 'Topic ignored' } };
    }

    const store = await this.resolveStore(shopDomain);
    if (!store) {
      console.warn('[shopifyWebhook] store not found:', shopDomain);
      return { status: 200, body: { success: true, message: 'Store not found, ignored' } };
    }

    if (webhookId) {
      try {
        await this.orderRepo.shopifyOrderRequestModel.create({
          shopifyEventId: webhookId,
          topic,
          shopifyOrderId: payload.id,
          status: 'PROCESSING',
          payload: JSON.stringify(payload),
          storeId: store.store_id,
        });
      } catch (err: any) {
        if (err.name === 'SequelizeUniqueConstraintError') {
          return { status: 200, body: { success: true, message: 'Duplicate webhook ignored' } };
        }
        throw err;
      }
    }

    let result: any;
    switch (topic) {
      case 'orders/create':
        result = await this.shopifyOrderWebhookHelper.processOrderCreate(payload, store);
        break;
      case 'orders/cancelled':
        result = await this.shopifyOrderWebhookHelper.processOrderCancel(payload, store);
        break;
      default:
        return { status: 200, body: { success: true, message: 'Topic ignored' } };
    }

    if (webhookId) {
      await this.orderRepo.shopifyOrderRequestModel.update(
        { status: result.ok ? 'DONE' : 'NO_MATCH', processedAt: new Date() },
        { where: { shopifyEventId: webhookId } },
      );
    }

    return {
      status: result.ok ? 201 : 200,
      body: { success: true, ...result },
    };
  }
}
