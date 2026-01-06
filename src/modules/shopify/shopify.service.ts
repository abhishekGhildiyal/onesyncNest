import { Injectable, Logger } from '@nestjs/common';
import { DataType } from '@shopify/shopify-api';
import { shopify } from './shopify.config';

@Injectable()
export class ShopifyService {
  private readonly logger = new Logger(ShopifyService.name);

  private getClient(store: any) {
    if (!store?.shopify_store || !store?.shopify_token) {
      throw new Error('Invalid store object: missing shopifyStore or shopifyToken');
    }

    let storeName = store.shopify_store.trim();
    if (!storeName.endsWith('.myshopify.com')) {
      storeName = `${storeName}.myshopify.com`;
    }

    const session = shopify.session.customAppSession(storeName);
    session.accessToken = store.shopify_token;

    return new shopify.clients.Rest({ session });
  }

  /** Find product by handle */
  async findProductByHandle(store: any, handle: string) {
    try {
      const client = this.getClient(store);
      const response: any = await client.get({
        path: 'products',
        query: { handle, limit: 1 },
      });
      return response.body.products[0] || null;
    } catch (err) {
      this.logger.error(`❌ findProductByHandle: ${err.message}`);
      return null;
    }
  }

  /** Create product */
  async createProduct(store: any, payload: any) {
    if (!payload?.product?.variants?.length) return null;
    try {
      const client = this.getClient(store);
      const response: any = await client.post({
        path: 'products',
        data: payload,
        type: DataType.JSON,
      });
      return response.body;
    } catch (err) {
      this.logger.error(`❌ createProduct: ${err.message}`);
      return null;
    }
  }

  /** Update product */
  async updateProduct(store: any, payload: any) {
    if (!payload?.product?.id) throw new Error('Missing Shopify product ID for update');
    try {
      const client = this.getClient(store);
      const response: any = await client.put({
        path: `products/${payload.product.id}`,
        data: payload,
        type: DataType.JSON,
      });
      return response.body;
    } catch (err) {
      this.logger.error(`❌ updateProduct: ${err.message}`);
      return null;
    }
  }

  /** Sync product: create or update */
  async syncProduct(store: any, payload: any) {
    // If product doesn't have Shopify ID, check by handle
    if (!payload.product.id && payload.product.handle) {
      const shopifyProduct = await this.findProductByHandle(store, payload.product.handle);
      if (shopifyProduct) {
        payload.product.id = shopifyProduct.id;

        // Map variant IDs by SKU if available
        shopifyProduct.variants.forEach((v: any) => {
          const variant = payload.product.variants.find((pv: any) => pv.sku === v.sku);
          if (variant) variant.id = v.id;
        });
      }
    }

    // Update if exists, else create
    if (payload.product.id) return this.updateProduct(store, payload);
    return this.createProduct(store, payload);
  }

  /** Delete multiple products by Shopify IDs */
  async deleteItems(store: any, shopifyIds: string[] = [], productId?: number) {
    if (!Array.isArray(shopifyIds) || shopifyIds.length === 0) {
      this.logger.warn('⚠️ No Shopify product IDs provided for deletion.');
      return [];
    }

    this.logger.log(`🧹 Starting Shopify deletion for product ${productId} (${shopifyIds.length} item(s))...`);

    const client = this.getClient(store);

    const results = await Promise.all(
      shopifyIds.map(async (id) => {
        try {
          const product: any = await client.get({ path: `products/${id}` }).catch(() => null);
          if (!product || !product.body?.product) {
            this.logger.warn(`⚠️ Product not found on Shopify for ID: ${id}`);
            return { id, success: false, message: 'Not found' };
          }

          const response: any = await client.delete({ path: `products/${id}` });
          this.logger.log(`✅ Deleted Shopify product ID: ${id}`);
          return { id, success: true, status: response?.status };
        } catch (err) {
          this.logger.error(`❌ Failed to delete Shopify product ID ${id}: ${err.message}`);
          return { id, success: false, error: err.message };
        }
      }),
    );

    const successCount = results.filter((r) => r.success).length;
    const notFoundCount = results.filter((r: any) => r.message === 'Not found').length;
    const failedCount = results.length - successCount - notFoundCount;

    this.logger.log(
      `🧾 Shopify Deletion Summary (product ${productId}) → Total: ${results.length}, Deleted: ${successCount}, Not Found: ${notFoundCount}, Failed: ${failedCount}`,
    );

    return results;
  }
}
