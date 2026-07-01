import { shopify } from './shopify.config';

const COST_TIER = {
  LOW: 10,
  MEDIUM: 50,
  HIGH: 200,
};

const _clientsByStore = new Map<string, ShopifyGraphqlClient>();

const isThrottled = (err: any) => {
  const text = `${err?.message || ''}${JSON.stringify(err?.response?.body || err?.graphQLErrors || '')}`;
  return /429|throttl|THROTTLED/i.test(text);
};

class ShopifyGraphqlClient {
  private _sdkClient: any;

  constructor(session: any) {
    this._sdkClient = new shopify.clients.Graphql({ session });
  }

  async request(
    query: string,
    variables: Record<string, unknown> = {},
    { retries = 5 }: { retries?: number; estimatedCost?: number } = {},
  ) {
    for (let attempt = 0; attempt < retries; attempt++) {
      try {
        const response = await this._sdkClient.request(query, { variables });
        return response.data ?? response;
      } catch (err: any) {
        if (isThrottled(err) && attempt < retries - 1) {
          const waitTime = Math.min(3000 * (attempt + 1), 15000);
          console.warn(`⏳ GraphQL throttled — retry in ${waitTime}ms (${attempt + 1}/${retries})`);
          await new Promise((r) => setTimeout(r, waitTime));
          continue;
        }
        throw err;
      }
    }
  }
}

export function shopifyGraphqlRequest(
  store: { shopify_store?: string; shopify_token?: string },
  query: string,
  variables: Record<string, unknown> = {},
  options: { estimatedCost?: number } = {},
) {
  let domain = String(store?.shopify_store || '').trim();
  if (!domain) throw new Error('Invalid store object: missing shopify_store');
  if (!domain.endsWith('.myshopify.com')) domain = `${domain}.myshopify.com`;
  domain = domain.toLowerCase();

  if (!_clientsByStore.has(domain)) {
    const token = store?.shopify_token;
    if (!token) throw new Error('Invalid store object: missing shopify_token');

    const session = shopify.session.customAppSession(domain);
    session.accessToken = token;
    _clientsByStore.set(domain, new ShopifyGraphqlClient(session));
  }

  return _clientsByStore.get(domain)!.request(query, variables, options);
}

export { COST_TIER };

const toLegacyId = (id: string | number | null | undefined) => {
  if (id == null || id === '') return null;
  const s = String(id);
  if (/^\d+$/.test(s)) return s;
  return s.split('/').pop() || null;
};

const toProductGid = (id: string | number) => `gid://shopify/Product/${toLegacyId(id)}`;
const toVariantGid = (id: string | number) => `gid://shopify/ProductVariant/${toLegacyId(id)}`;
const toCollectionGid = (id: string | number) => `gid://shopify/Collection/${toLegacyId(id)}`;

const escapeSearchQuery = (value: string) => value.replace(/'/g, "\\'");

const throwGraphqlUserErrors = (userErrors: { field?: string[]; message: string }[] | undefined, op: string) => {
  if (userErrors?.length) {
    throw new Error(`${op}: ${userErrors.map((e) => e.message).join('; ')}`);
  }
};

const METAFIELDS_SET_MUTATION = `
  mutation metafieldsSet($metafields: [MetafieldsSetInput!]!) {
    metafieldsSet(metafields: $metafields) {
      metafields { id namespace key }
      userErrors { field message }
    }
  }
`;

const COLLECTIONS_QUERY = `
  query collectionsByTitle($query: String!) {
    collections(first: 1, query: $query) {
      nodes { id legacyResourceId title }
    }
  }
`;

const COLLECTION_ADD_PRODUCTS_MUTATION = `
  mutation collectionAddProducts($id: ID!, $productIds: [ID!]!) {
    collectionAddProducts(id: $id, productIds: $productIds) {
      collection { id }
      userErrors { field message }
    }
  }
`;

const _storeCollectionByTitle = new Map<string, { id: string; title: string }>();

export async function shopifyGraphqlMetafieldsSet(
  store: { shopify_store?: string; shopify_token?: string },
  metafields: Record<string, unknown>[],
) {
  if (!metafields.length) return;
  const data = await shopifyGraphqlRequest(store, METAFIELDS_SET_MUTATION, { metafields });
  throwGraphqlUserErrors((data as any)?.metafieldsSet?.userErrors, 'metafieldsSet');
}

export async function shopifyGraphqlUpsertStockXMetafields(
  store: { shopify_store?: string; shopify_token?: string },
  shopifyProductId: string | number,
  productList: { stockXStyleId?: string; stockXSizeChart?: string },
) {
  if (!shopifyProductId || !productList) return;
  const ownerId = toProductGid(shopifyProductId);
  const metafields: Record<string, unknown>[] = [];

  if (productList.stockXStyleId) {
    metafields.push({
      ownerId,
      namespace: 'StockX',
      key: 'StyleID',
      value: String(productList.stockXStyleId),
      type: 'single_line_text_field',
    });
  }
  if (productList.stockXSizeChart) {
    metafields.push({
      ownerId,
      namespace: 'StockX',
      key: 'SizeLocale',
      value: String(productList.stockXSizeChart),
      type: 'single_line_text_field',
    });
  }

  try {
    await shopifyGraphqlMetafieldsSet(store, metafields);
  } catch (err: any) {
    console.error('❌ upsertStockXMetafields (GraphQL):', err.message);
  }
}

export async function shopifyGraphqlUpsertVariantMetafields(
  store: { shopify_store?: string; shopify_token?: string },
  shopifyVariantId: string | number,
  variant: { option1Value?: string; option1?: string; option2Value?: string; _stockXStyleId?: string },
) {
  if (!shopifyVariantId || !variant) return;
  const sizeValue = variant.option1Value || variant.option1;
  if (!sizeValue || !variant._stockXStyleId) return;
  const condition = (variant.option2Value || '').toLowerCase();
  if (condition && condition !== 'new') return;

  try {
    await shopifyGraphqlMetafieldsSet(store, [
      {
        ownerId: toVariantGid(shopifyVariantId),
        namespace: 'StockX',
        key: 'Size',
        value: String(sizeValue),
        type: 'single_line_text_field',
      },
    ]);
  } catch (err: any) {
    console.error('❌ upsertVariantMetafields (GraphQL):', err.message);
  }
}

export async function shopifyGraphqlFindCollectionByTitle(
  store: { shopify_store?: string; shopify_token?: string },
  title: string,
) {
  if (!title) return null;

  const domain = String(store?.shopify_store || '').toLowerCase();
  const cacheKey = `${domain}::${title.toLowerCase()}`;
  if (_storeCollectionByTitle.has(cacheKey)) {
    return _storeCollectionByTitle.get(cacheKey)!;
  }

  try {
    const data = await shopifyGraphqlRequest(store, COLLECTIONS_QUERY, {
      query: `title:'${escapeSearchQuery(title)}'`,
    });
    const node = (data as any)?.collections?.nodes?.[0];
    if (!node) return null;
    const collection = {
      id: toLegacyId(node.legacyResourceId || node.id)!,
      title: node.title,
    };
    _storeCollectionByTitle.set(cacheKey, collection);
    return collection;
  } catch (err: any) {
    console.error(`❌ findCollectionByTitle (GraphQL):`, err.message);
    return null;
  }
}

export async function shopifyGraphqlAddToCollection(
  store: { shopify_store?: string; shopify_token?: string },
  shopifyProductId: string | number,
  collectionId: string | number,
) {
  if (!shopifyProductId || !collectionId) return;
  try {
    const data = await shopifyGraphqlRequest(store, COLLECTION_ADD_PRODUCTS_MUTATION, {
      id: toCollectionGid(collectionId),
      productIds: [toProductGid(shopifyProductId)],
    });
    throwGraphqlUserErrors((data as any)?.collectionAddProducts?.userErrors, 'collectionAddProducts');
  } catch (err: any) {
    if (!err.message.includes('already')) {
      console.error(`❌ addToCollection (GraphQL):`, err.message);
    }
  }
}
