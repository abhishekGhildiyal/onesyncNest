import { shopifyGraphqlRequest } from './shopify-graphql.client';
import { isNotFoundError } from 'src/common/helpers/shopify/shopify-sync-errors';

const COST_TIER = { SIMPLE: 1, MEDIUM: 5, COMPLEX: 10, VERY_COMPLEX: 50 };

const _storePublicationIds = new Map<string, string>();

const toLegacyId = (id: string | number | null | undefined) => {
  if (id == null || id === '') return null;
  const s = String(id);
  if (/^\d+$/.test(s)) return s;
  return s.split('/').pop() || null;
};

const toProductGid = (id: string | number) => `gid://shopify/Product/${toLegacyId(id)}`;
const toVariantGid = (id: string | number) => `gid://shopify/ProductVariant/${toLegacyId(id)}`;
const toOrderGid = (id: string | number) => `gid://shopify/Order/${toLegacyId(id)}`;

const throwGraphqlUserErrors = (userErrors: { field?: string[]; message: string }[] | undefined, op: string) => {
  if (userErrors?.length) {
    throw new Error(`${op}: ${userErrors.map((e) => e.message).join('; ')}`);
  }
};

const estimateProductSetCost = (product: any = {}) => {
  let cost = COST_TIER.COMPLEX;
  const variantCount = product.variants?.length || 0;
  const imageCount = product.images?.length || 0;
  if (variantCount > 10 || imageCount > 0) cost += 5;
  if (variantCount > 50 || imageCount > 3) cost = COST_TIER.VERY_COMPLEX;
  return Math.min(cost, COST_TIER.VERY_COMPLEX);
};

const PRODUCT_SET_MUTATION = `
  mutation productSet($input: ProductSetInput!, $identifier: ProductSetIdentifiers, $synchronous: Boolean!) {
    productSet(input: $input, identifier: $identifier, synchronous: $synchronous) {
      product {
        id
        legacyResourceId
        handle
        variants(first: 100) {
          nodes {
            id
            legacyResourceId
            sku
            barcode
            inventoryItem { legacyResourceId }
            selectedOptions { name value }
          }
        }
      }
      userErrors { field message }
    }
  }
`;

const PRODUCT_DELETE_MUTATION = `
  mutation productDelete($input: ProductDeleteInput!) {
    productDelete(input: $input) {
      deletedProductId
      userErrors { field message }
    }
  }
`;

const PRODUCT_BY_HANDLE_QUERY = `
  query productByHandle($handle: String!) {
    productByHandle(handle: $handle) {
      id
      legacyResourceId
      handle
      options {
        name
        optionValues { name }
      }
      variants(first: 100) {
        nodes {
          id
          legacyResourceId
          sku
          barcode
          inventoryItem { legacyResourceId }
          selectedOptions { name value }
        }
      }
    }
  }
`;

const PRODUCT_BY_ID_QUERY = `
  query productById($id: ID!) {
    product(id: $id) {
      id
      legacyResourceId
      handle
      options {
        name
        optionValues { name }
      }
      variants(first: 100) {
        nodes {
          id
          legacyResourceId
          sku
          barcode
          inventoryItem { legacyResourceId }
          selectedOptions { name value }
        }
      }
    }
  }
`;

const PUBLISHABLE_PUBLISH_MUTATION = `
  mutation publishablePublish($id: ID!, $input: [PublicationInput!]!) {
    publishablePublish(id: $id, input: $input) {
      userErrors { field message }
    }
  }
`;

const ONLINE_STORE_CATALOG_QUERY = `
  query onlineStoreCatalog {
    catalogs(first: 5, type: APP, query: "title:Online Store") {
      nodes {
        title
        publication { id }
      }
    }
  }
`;

const VARIANT_BY_ID_QUERY = `
  query productVariantById($id: ID!) {
    productVariant(id: $id) {
      id
      legacyResourceId
      sku
      barcode
      price
      title
      inventoryItem { legacyResourceId }
      selectedOptions { name value }
    }
  }
`;

const ORDER_UPDATE_MUTATION = `
  mutation orderUpdate($input: OrderInput!) {
    orderUpdate(input: $input) {
      order {
        id
        legacyResourceId
        note
      }
      userErrors { field message }
    }
  }
`;

const PUBLICATIONS_QUERY = `
  query appPublications {
    publications(first: 20, catalogType: APP) {
      nodes {
        id
        catalog {
          title
          ... on AppCatalog {
            apps(first: 1) {
              nodes { handle }
            }
          }
        }
      }
    }
  }
`;

const restProductToProductSetInput = (product: any, storeInstance: any) => {
  const input: Record<string, unknown> = {
    title: product.title,
    descriptionHtml: product.body_html || '',
    vendor: product.vendor || '',
    productType: product.product_type || '',
    tags: product.tags
      ? product.tags
          .split(',')
          .map((t: string) => t.trim())
          .filter(Boolean)
      : [],
    status: product.status === 'active' ? 'ACTIVE' : 'DRAFT',
  };

  if (product.handle && !product.id) input.handle = product.handle;

  const options = (product.options || []).filter((opt: any) => Array.isArray(opt.values) && opt.values.length > 0);

  if (product.variants?.length) {
    input.variants = product.variants.map((v: any) => {
      const optionValues: { optionName: string; name: string }[] = [];
      options.forEach((opt: any, idx: number) => {
        const val = v[`option${idx + 1}`];
        const resolved = val != null && String(val).trim() !== '' ? String(val) : 'N/A';
        optionValues.push({ optionName: opt.name, name: resolved });
        if (!opt.values.includes(resolved)) opt.values.push(resolved);
      });
      if (!optionValues.length && v.option1) {
        optionValues.push({ optionName: 'Title', name: String(v.option1) });
      }

      const variantInput: Record<string, unknown> = {
        sku: v.sku || undefined,
        barcode: v.barcode || undefined,
        price: String(parseFloat(v.price) || 0),
        taxable: v.taxable !== false,
        inventoryPolicy: 'DENY',
        optionValues,
      };

      if (v.id) variantInput.id = toVariantGid(v.id);
      if (v.compare_at_price) variantInput.compareAtPrice = String(parseFloat(v.compare_at_price));

      if (v.inventory_management === 'shopify') {
        variantInput.inventoryItem = { tracked: true };
        const qty = Number(v.inventory_quantity);
        const locationId = storeInstance?.location_id || storeInstance?.locationId;
        if (locationId && qty > 0) {
          variantInput.inventoryQuantities = [
            {
              locationId: `gid://shopify/Location/${locationId}`,
              name: 'available',
              quantity: qty,
            },
          ];
        }
      }

      return variantInput;
    });
  }

  if (options.length) {
    input.productOptions = options.map((opt: any) => ({
      name: opt.name,
      values: opt.values.map((v: string) => ({ name: String(v) })),
    }));
  }

  if (product.images?.length) {
    input.files = product.images.filter((img: any) => img?.src).map((img: any) => ({ originalSource: img.src }));
  }

  return input;
};

const graphqlOptionsToRest = (gqlOptions: any[] = []) =>
  gqlOptions.map((opt) => ({
    name: opt.name,
    values: (opt.optionValues || opt.values || [])
      .map((v: any) => (typeof v === 'string' ? v : v?.name))
      .filter(Boolean),
  }));

const graphqlProductToRestBody = (gqlProduct: any) => {
  if (!gqlProduct) return null;

  const variantNodes = gqlProduct.variants?.nodes || [];
  const variants = variantNodes.map((node: any) => ({
    id: toLegacyId(node.legacyResourceId || node.id),
    sku: node.sku,
    barcode: node.barcode || null,
    inventory_item_id: node.inventoryItem?.legacyResourceId
      ? Number(toLegacyId(node.inventoryItem.legacyResourceId))
      : null,
    option1: node.selectedOptions?.[0]?.value || null,
    option2: node.selectedOptions?.[1]?.value || null,
    option3: node.selectedOptions?.[2]?.value || null,
  }));

  return {
    product: {
      id: toLegacyId(gqlProduct.legacyResourceId || gqlProduct.id),
      handle: gqlProduct.handle,
      options: graphqlOptionsToRest(gqlProduct.options),
      variants,
    },
  };
};

const graphqlProductToRestProduct = (gqlProduct: any) => {
  if (!gqlProduct) return null;
  const body = graphqlProductToRestBody(gqlProduct);
  return body?.product || null;
};

export class ShopifyGraphqlService {
  private readonly storeInstance: any;
  private readonly storeKey: string;

  constructor(storeInstance: any) {
    this.storeInstance = storeInstance;
    this.storeKey = String(storeInstance?.shopify_store || '').toLowerCase();
  }

  private request(query: string, variables: Record<string, unknown> = {}, options: { estimatedCost?: number } = {}) {
    return shopifyGraphqlRequest(this.storeInstance, query, variables, options);
  }

  private async getOnlineStorePublicationId() {
    if (_storePublicationIds.has(this.storeKey)) {
      return _storePublicationIds.get(this.storeKey)!;
    }

    try {
      const catalogData = await this.request(ONLINE_STORE_CATALOG_QUERY, {}, { estimatedCost: COST_TIER.MEDIUM });
      const publicationId = (catalogData as any)?.catalogs?.nodes?.[0]?.publication?.id;
      if (publicationId) {
        _storePublicationIds.set(this.storeKey, publicationId);
        return publicationId;
      }
    } catch (err: any) {
      console.warn('⚠️ onlineStoreCatalog lookup:', err.message);
    }

    const data = await this.request(PUBLICATIONS_QUERY, {}, { estimatedCost: COST_TIER.MEDIUM });
    const pubs = (data as any)?.publications?.nodes || [];
    const online = pubs.find((p: any) => {
      const catalogTitle = (p.catalog?.title || '').toLowerCase();
      const appHandle = p.catalog?.apps?.nodes?.[0]?.handle || '';
      return catalogTitle.includes('online store') || appHandle === 'online_store';
    });
    const publicationId = online?.id || pubs[0]?.id || null;
    if (publicationId) _storePublicationIds.set(this.storeKey, publicationId);
    return publicationId;
  }

  private async publishToOnlineStore(productGid: string) {
    const publicationId = await this.getOnlineStorePublicationId();
    if (!publicationId) return;
    const data = await this.request(
      PUBLISHABLE_PUBLISH_MUTATION,
      { id: productGid, input: [{ publicationId }] },
      { estimatedCost: COST_TIER.SIMPLE },
    );
    throwGraphqlUserErrors((data as any)?.publishablePublish?.userErrors, 'publishablePublish');
  }

  private async productSet(restPayload: any, { isUpdate = false }: { isUpdate?: boolean } = {}) {
    const product = restPayload.product;
    const variables: Record<string, unknown> = {
      input: restProductToProductSetInput(product, this.storeInstance),
      synchronous: true,
    };
    if (isUpdate && product.id) {
      variables.identifier = { id: toProductGid(product.id) };
    }

    const data = await this.request(PRODUCT_SET_MUTATION, variables, {
      estimatedCost: estimateProductSetCost(product),
    });
    throwGraphqlUserErrors((data as any)?.productSet?.userErrors, 'productSet');

    const gqlProduct = (data as any)?.productSet?.product;
    if (!gqlProduct) return null;

    if (product.published === true || product.published_scope === 'web') {
      try {
        await this.publishToOnlineStore(gqlProduct.id);
      } catch (pubErr: any) {
        console.warn('⚠️ publishToOnlineStore:', pubErr.message);
      }
    }

    return graphqlProductToRestBody(gqlProduct);
  }

  async createProduct(payload: any) {
    if (!payload?.product?.variants?.length) return null;
    return this.productSet(payload, { isUpdate: false });
  }

  async updateProduct(payload: any) {
    if (!payload?.product?.id) throw new Error('Missing Shopify product ID for update');
    return this.productSet(payload, { isUpdate: true });
  }

  async deleteProduct(legacyId: string | number) {
    const data = await this.request(
      PRODUCT_DELETE_MUTATION,
      { input: { id: toProductGid(legacyId) } },
      { estimatedCost: COST_TIER.SIMPLE },
    );
    throwGraphqlUserErrors((data as any)?.productDelete?.userErrors, 'productDelete');
    return { status: 200 };
  }

  async findProductByHandle(handle: string) {
    if (!handle) return null;
    try {
      const data = await this.request(PRODUCT_BY_HANDLE_QUERY, { handle }, { estimatedCost: COST_TIER.MEDIUM });
      return graphqlProductToRestProduct((data as any)?.productByHandle);
    } catch (err) {
      if (isNotFoundError(err)) return null;
      throw err;
    }
  }

  async findProductById(legacyId: string | number) {
    const data = await this.request(
      PRODUCT_BY_ID_QUERY,
      { id: toProductGid(legacyId) },
      { estimatedCost: COST_TIER.MEDIUM },
    );
    return graphqlProductToRestProduct((data as any)?.product);
  }

  async getVariantDetailsFromShopify(variantId: string | number) {
    if (!variantId) return null;
    try {
      const data = await this.request(
        VARIANT_BY_ID_QUERY,
        { id: toVariantGid(variantId) },
        { estimatedCost: COST_TIER.MEDIUM },
      );
      const node = (data as any)?.productVariant;
      if (!node) return null;
      return {
        id: toLegacyId(node.legacyResourceId || node.id),
        sku: node.sku,
        barcode: node.barcode || null,
        price: node.price,
        title: node.title,
        inventory_item_id: node.inventoryItem?.legacyResourceId
          ? Number(toLegacyId(node.inventoryItem.legacyResourceId))
          : null,
        option1: node.selectedOptions?.[0]?.value || null,
        option2: node.selectedOptions?.[1]?.value || null,
        option3: node.selectedOptions?.[2]?.value || null,
      };
    } catch (err: any) {
      console.warn(`[ShopifyService] getVariantDetailsFromShopify failed for ${variantId}:`, err.message);
      return null;
    }
  }

  async updateShopifyOrderNotes(orderId: string | number, note: string) {
    if (!orderId) return null;
    try {
      const data = await this.request(
        ORDER_UPDATE_MUTATION,
        { input: { id: toOrderGid(orderId), note } },
        { estimatedCost: COST_TIER.SIMPLE },
      );
      throwGraphqlUserErrors((data as any)?.orderUpdate?.userErrors, 'orderUpdate');
      const order = (data as any)?.orderUpdate?.order;
      if (!order) return null;
      return {
        id: toLegacyId(order.legacyResourceId || order.id),
        note: order.note,
      };
    } catch (err: any) {
      console.warn(`[ShopifyService] updateShopifyOrderNotes failed for ${orderId}:`, err.message);
      return null;
    }
  }
}
