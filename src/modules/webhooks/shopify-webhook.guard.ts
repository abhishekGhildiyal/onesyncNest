import { CanActivate, ExecutionContext, Injectable, UnauthorizedException } from '@nestjs/common';
import { createHmac, timingSafeEqual } from 'crypto';
import { Request } from 'express';
import { Op } from 'sequelize';
import { StoreRepository } from 'src/db/repository/store.repository';

const normalizeShopDomain = (domain = '') => domain.trim().toLowerCase().replace(/^https?:\/\//, '');

@Injectable()
export class ShopifyWebhookGuard implements CanActivate {
  constructor(private readonly storeRepo: StoreRepository) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    if (process.env.SKIP_SHOPIFY_WEBHOOK_HMAC === 'true') {
      return true;
    }

    const request = context.switchToHttp().getRequest<Request & { rawBody?: Buffer }>();
    const hmacHeader = request.get('X-Shopify-Hmac-Sha256');
    const shopDomain = request.get('X-Shopify-Shop-Domain');
    const rawBody = request.rawBody;

    if (!hmacHeader || !rawBody) {
      throw new UnauthorizedException({ success: false, message: 'Missing Shopify webhook signature' });
    }

    const secret = await this.resolveWebhookSecret(shopDomain);
    if (!secret) {
      throw new UnauthorizedException({ success: false, message: 'Webhook secret not configured for store' });
    }

    const calculated = createHmac('sha256', secret).update(rawBody).digest('base64');
    const calculatedBuf = Buffer.from(calculated, 'utf8');
    const headerBuf = Buffer.from(hmacHeader, 'utf8');

    if (calculatedBuf.length !== headerBuf.length || !timingSafeEqual(calculatedBuf, headerBuf)) {
      throw new UnauthorizedException({ success: false, message: 'Invalid HMAC' });
    }

    return true;
  }

  private async resolveWebhookSecret(shopDomain?: string): Promise<string | null> {
    const envSecret = process.env.SHOPIFY_WEBHOOK_SECRET || process.env.SHOPIFY_API_SECRET || null;
    if (!shopDomain) return envSecret;

    try {
      const normalized = normalizeShopDomain(shopDomain);
      const storeName = normalized.replace(/\.myshopify\.com$/, '');
      const store = await this.storeRepo.storeModel.findOne({
        where: {
          [Op.or]: [
            { shopify_store: normalized },
            { shopify_store: storeName },
            { shopify_store: `${storeName}.myshopify.com` },
          ],
        },
        attributes: ['web_hook_token'],
      });
      if (store?.web_hook_token) return store.web_hook_token;
    } catch (err) {
      console.warn('[ShopifyWebhookGuard] store lookup failed, falling back to env secret:', err.message);
    }

    return envSecret;
  }
}
