import {
  shopifyGraphqlAddToCollection,
  shopifyGraphqlFindCollectionByTitle,
  shopifyGraphqlUpsertStockXMetafields,
  shopifyGraphqlUpsertVariantMetafields,
} from './shopify-graphql.client';
import { ShopifyGraphqlService } from './shopify-graphql.service';
import { isNotFoundError } from 'src/common/helpers/shopify/shopify-sync-errors';

interface StoreConfig {
  shopify_store: string;
  shopify_token: string;
  id?: string | number;
  store_domain?: string;
  is_discount?: boolean;
  is_used_only_products_store?: boolean;
  location_id?: string;
  locationId?: string;
}

/** @deprecated GraphQL-only service; option kept for call-site compatibility */
export interface ShopifyServiceOptions {
  useGraphql?: boolean;
}

export interface DeleteResult {
  id: string;
  success: boolean;
  message?: string;
  error?: string;
  status?: number;
}

export class ShopifyServiceFactory {
  private serviceCache = new Map<string, ShopifyService>();

  createService(store: StoreConfig, _options: ShopifyServiceOptions = {}): ShopifyService {
    if (!store?.shopify_store || !store?.shopify_token) {
      throw new Error('Invalid store object: missing shopify_store or shopify_token');
    }

    const cacheKey = `${store.shopify_store}:${store.shopify_token}`;

    if (this.serviceCache.has(cacheKey)) {
      return this.serviceCache.get(cacheKey)!;
    }

    const service = new ShopifyService(store);
    this.serviceCache.set(cacheKey, service);

    return service;
  }
}

/** Shopify Admin API client — GraphQL only (no REST). */
export class ShopifyService {
  private readonly storeConfig: StoreConfig;
  private readonly graphql: ShopifyGraphqlService;

  constructor(store: StoreConfig, _options: ShopifyServiceOptions = {}) {
    if (!store.shopify_store || !store.shopify_token) {
      throw new Error('Invalid store object: missing shopifyStore or shopifyToken');
    }

    this.storeConfig = store;
    this.graphql = new ShopifyGraphqlService(store);
  }

  getStoreConfig(): StoreConfig {
    return this.storeConfig;
  }

  async findProductByHandle(handle: string): Promise<any> {
    if (!handle) return null;
    try {
      return await this.graphql.findProductByHandle(handle);
    } catch (err: any) {
      if (isNotFoundError(err)) return null;
      console.error('❌ findProductByHandle:', err.message);
      return null;
    }
  }

  async createProduct(payload: any): Promise<any> {
    if (!payload?.product?.variants?.length) return null;
    try {
      return await this.graphql.createProduct(payload);
    } catch (err: any) {
      console.error('❌ createProduct:', err.message);
      return null;
    }
  }

  async updateProduct(payload: any): Promise<any> {
    if (!payload?.product?.id) throw new Error('Missing Shopify product ID for update');
    try {
      return await this.graphql.updateProduct(payload);
    } catch (err: any) {
      console.error('❌ updateProduct:', err.message);
      return null;
    }
  }

  private variantOptionKey(variant: any) {
    return [variant?.option1, variant?.option2, variant?.option3]
      .map((value) => String(value ?? '').trim().toLowerCase())
      .join('|');
  }

  private mapVariantIds(payload: any, shopifyVariants: any[] = []) {
    if (!payload?.product?.variants?.length || !shopifyVariants.length) return;
    payload.product.variants.forEach((pv: any) => {
      if (pv.id) return;
      const match = shopifyVariants.find(
        (sv) => pv.sku === sv.sku && this.variantOptionKey(pv) === this.variantOptionKey(sv),
      );
      if (match?.id) pv.id = match.id;
    });
  }

  private dedupePayloadVariants(payload: any) {
    const product = payload?.product;
    if (!product?.variants?.length) return;

    const byKey = new Map<string, any>();
    for (const variant of product.variants) {
      const key = this.variantOptionKey(variant);
      const existing = byKey.get(key);
      if (existing) {
        existing.inventory_quantity =
          (Number(existing.inventory_quantity) || 0) + (Number(variant.inventory_quantity) || 0);
        if (!existing.id && variant.id) existing.id = variant.id;
        continue;
      }
      byKey.set(key, { ...variant });
    }
    product.variants = Array.from(byKey.values());
  }

  private ensureVariantOptionValues(payload: any, existingProduct: any) {
    const existingOptions = existingProduct?.options || [];
    if (!existingOptions.length || !payload?.product) return;

    const payloadProduct = payload.product;
    if (!payloadProduct.options?.length) {
      payloadProduct.options = existingOptions.map((opt: any) => ({
        name: opt.name,
        values: [...(opt.values || [])],
      }));
    } else {
      const payloadNames = new Set(payloadProduct.options.map((opt: any) => opt.name));
      for (const existingOpt of existingOptions) {
        if (!payloadNames.has(existingOpt.name)) {
          payloadProduct.options.push({
            name: existingOpt.name,
            values: [...(existingOpt.values || ['N/A'])],
          });
        }
      }
    }

    payloadProduct.variants = (payloadProduct.variants || []).map((variant: any) => {
      const enriched = { ...variant };
      payloadProduct.options.forEach((opt: any, idx: number) => {
        const key = `option${idx + 1}`;
        const current = enriched[key];
        if (current == null || String(current).trim() === '') {
          const fallback = opt.values?.[0] || 'N/A';
          enriched[key] = fallback;
          if (!opt.values?.includes(fallback)) {
            opt.values = [...(opt.values || []), fallback];
          }
        } else if (opt.values && !opt.values.includes(current)) {
          opt.values = [...opt.values, current];
        }
      });
      return enriched;
    });
  }

  private async fetchShopifyProduct(productId: string | number) {
    return this.graphql.findProductById(productId);
  }

  async syncProduct(payload: any): Promise<any> {
    if (payload.product.id) {
      try {
        const existing = await this.fetchShopifyProduct(payload.product.id);
        if (existing) {
          this.ensureVariantOptionValues(payload, existing);
          this.mapVariantIds(payload, existing.variants || []);
          this.dedupePayloadVariants(payload);
        }
      } catch (err: any) {
        console.warn(`⚠️ Could not fetch Shopify product ${payload.product.id} for option mapping: ${err.message}`);
      }
    } else if (payload.product.handle) {
      const shopifyProduct = await this.findProductByHandle(payload.product.handle);
      if (shopifyProduct) {
        payload.product.id = shopifyProduct.id;
        this.ensureVariantOptionValues(payload, shopifyProduct);
        this.mapVariantIds(payload, shopifyProduct.variants || []);
        this.dedupePayloadVariants(payload);
      }
    }

    if (payload.product.id) return this.updateProduct(payload);
    return this.createProduct(payload);
  }

  async deleteItems(shopifyIds: string[] = [], productId?: number): Promise<DeleteResult[]> {
    if (!Array.isArray(shopifyIds) || shopifyIds.length === 0) {
      console.warn('⚠️ No Shopify product IDs provided for deletion.');
      return [];
    }

    console.log(
      `🧹 Starting Shopify deletion for product ${productId} (${shopifyIds.length} item(s))...`,
    );

    const results: DeleteResult[] = [];
    for (let i = 0; i < shopifyIds.length; i++) {
      const id = shopifyIds[i];
      try {
        await this.graphql.deleteProduct(id);
        console.log(`✅ Deleted Shopify product ID: ${id} (GraphQL)`);
        results.push({ id, success: true, status: 200 });
      } catch (err: any) {
        const isNotFound = /not found|does not exist|could not find/i.test(err.message || '');
        if (isNotFound) {
          console.warn(`⚠️ Product not found on Shopify for ID: ${id}`);
          results.push({ id, success: false, message: 'Not found' });
        } else {
          console.error(`❌ Failed to delete Shopify product ID ${id}:`, err.message);
          results.push({ id, success: false, error: err.message });
        }
      }

      if (i < shopifyIds.length - 1) {
        await new Promise((resolve) => setTimeout(resolve, 500));
      }
    }

    const successCount = results.filter((r) => r.success).length;
    const notFoundCount = results.filter((r) => r.message === 'Not found').length;
    const failedCount = results.length - successCount - notFoundCount;

    console.log(
      `🧾 Shopify Deletion Summary (product ${productId}) → Total: ${results.length}, Deleted: ${successCount}, Not Found: ${notFoundCount}, Failed: ${failedCount}`,
    );

    return results;
  }

  getVariantDetailsFromShopify(variantId: string | number) {
    return this.graphql.getVariantDetailsFromShopify(variantId);
  }

  updateShopifyOrderNotes(orderId: string | number, note: string) {
    return this.graphql.updateShopifyOrderNotes(orderId, note);
  }

  upsertStockXMetafields(shopifyProductId: string | number, productList: any) {
    if (!shopifyProductId || !productList) return;
    if (!productList.stockXStyleId && !productList.stockXSizeChart) return;
    return shopifyGraphqlUpsertStockXMetafields(this.storeConfig, shopifyProductId, productList);
  }

  upsertVariantMetafields(shopifyVariantId: string | number, variant: any) {
    if (!shopifyVariantId || !variant) return;
    const sizeValue = variant.option1Value || variant.option1;
    if (!sizeValue || !variant._stockXStyleId) return;
    const condition = (variant.option2Value || '').toLowerCase();
    if (condition && condition !== 'new') return;
    return shopifyGraphqlUpsertVariantMetafields(this.storeConfig, shopifyVariantId, variant);
  }

  addToCollection(shopifyProductId: string | number, collectionId: string | number) {
    if (!shopifyProductId || !collectionId) return;
    return shopifyGraphqlAddToCollection(this.storeConfig, shopifyProductId, collectionId);
  }

  findCollectionByTitle(title: string) {
    if (!title) return null;
    return shopifyGraphqlFindCollectionByTitle(this.storeConfig, title);
  }
}
