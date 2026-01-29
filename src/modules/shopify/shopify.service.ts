// shopify.service.ts
import { Logger } from '@nestjs/common';
import { DataType } from '@shopify/shopify-api';
import { shopify } from './shopify.config';

interface StoreConfig {
  shopify_store: string;
  shopify_token: string;
  id?: string | number;
  store_domain?: string;
  is_discount?: boolean;
}

export interface DeleteResult {
  id: string;
  success: boolean;
  message?: string;
  error?: string;
  status?: number;
}

export class ShopifyServiceFactory {
  private readonly logger = new Logger(ShopifyServiceFactory.name);
  private serviceCache = new Map<string, ShopifyService>();

  createService(store: StoreConfig): ShopifyService {
    if (!store?.shopify_store || !store?.shopify_token) {
      throw new Error('Invalid store object: missing shopify_store or shopify_token');
    }

    const cacheKey = `${store.shopify_store}:${store.shopify_token}`;

    if (this.serviceCache.has(cacheKey)) {
      return this.serviceCache.get(cacheKey)!;
    }

    const service = new ShopifyService(store);
    this.serviceCache.set(cacheKey, service);

    this.logger.log(`🛒 Shopify service created for ${store.shopify_store}`);

    return service;
  }
}

export class ShopifyService {
  private readonly logger = new Logger(ShopifyService.name);
  private storeConfig: StoreConfig;
  private client: any;
  private session: any;

  constructor(store: StoreConfig) {
    if (!store.shopify_store || !store.shopify_token) {
      throw new Error('Invalid store object: missing shopifyStore or shopifyToken');
    }

    this.storeConfig = store;
    this.initializeClient();
  }

  private initializeClient(): void {
    // Clean the store name
    let storeName = this.storeConfig.shopify_store.trim();
    if (!storeName.endsWith('.myshopify.com')) {
      storeName = `${storeName}.myshopify.com`;
    }

    // Create session for the store
    this.session = shopify.session.customAppSession(storeName);
    this.session.accessToken = this.storeConfig.shopify_token;

    // REST client using the new API structure
    this.client = new shopify.clients.Rest({ session: this.session });
  }

  getStoreConfig(): StoreConfig {
    return this.storeConfig;
  }

  /** Find product by handle */
  async findProductByHandle(handle: string): Promise<any> {
    try {
      const response: any = await this.client.get({
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
  async createProduct(payload: any): Promise<any> {
    if (!payload?.product?.variants?.length) return null;
    try {
      const response: any = await this.client.post({
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
  async updateProduct(payload: any): Promise<any> {
    if (!payload?.product?.id) throw new Error('Missing Shopify product ID for update');
    try {
      const response: any = await this.client.put({
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
  async syncProduct(payload: any): Promise<any> {
    // If product doesn't have Shopify ID, check by handle
    if (!payload.product.id && payload.product.handle) {
      const shopifyProduct = await this.findProductByHandle(payload.product.handle);
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
    if (payload.product.id) return this.updateProduct(payload);
    return this.createProduct(payload);
  }

  /** Delete multiple products by Shopify IDs */
  async deleteItems(shopifyIds: string[] = [], productId?: number): Promise<DeleteResult[]> {
    if (!Array.isArray(shopifyIds) || shopifyIds.length === 0) {
      this.logger.warn('⚠️ No Shopify product IDs provided for deletion.');
      return [];
    }

    this.logger.log(`🧹 Starting Shopify deletion for product ${productId} (${shopifyIds.length} item(s))...`);

    const results = await Promise.all(
      shopifyIds.map(async (id) => {
        try {
          const product: any = await this.client.get({ path: `products/${id}` }).catch(() => null);
          if (!product || !product.body?.product) {
            this.logger.warn(`⚠️ Product not found on Shopify for ID: ${id}`);
            return { id, success: false, message: 'Not found' };
          }

          const response: any = await this.client.delete({ path: `products/${id}` });
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
