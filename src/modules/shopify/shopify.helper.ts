/**
 * Sanitize handle: lowercase, no spaces, replace invalid chars with "-"
 */
export function sanitizeHandle(handle: string): string | undefined {
  if (!handle) return undefined;
  return handle.toLowerCase().replace(/[^a-z0-9\-]+/g, '-');
}

/**
 * Build Shopify payload for product sync
 */
export function buildShopifyPayload(inventory: any, variants: any[] = [], store: any, template: any) {
  const isWeb = inventory?.publishedScope === 'web';

  // 1️⃣ Build tags
  let tags = '';
  const hasGoatApp = store?.isGoatAppInstalled;
  const isStadiumGoods = store?.isStadiumGoods;
  const dbTags = inventory?.productList?.tags || [];

  if (isWeb) {
    tags = dbTags
      .filter((t: any) => t.web)
      .map((t: any) => t.input)
      .join(', ');
    tags = hasGoatApp
      ? `OSM, OSW, gsync${isStadiumGoods ? ', stadiumgoods' : ''}${tags ? ', ' + tags : ''}`
      : `OSM, OSW${isStadiumGoods ? ', stadiumgoods' : ''}${tags ? ', ' + tags : ''}`;
  } else {
    tags = dbTags
      .filter((t: any) => t.pos)
      .map((t: any) => t.input)
      .join(', ');
    tags = hasGoatApp ? `OSM, OSP, gexclude${tags ? ', ' + tags : ''}` : `OSM, OSP${tags ? ', ' + tags : ''}`;
  }

  // 2️⃣ Product core
  const payload: any = {
    product: {
      id: inventory.shopifyId || undefined,
      title: inventory.itemName,
      handle: sanitizeHandle(inventory.itemName),
      body_html: inventory.description || '',
      vendor: inventory.brand,
      product_type: inventory.type,
      status: 'active',
      published_scope: isWeb ? 'web' : 'global',
      tags,
      options: [],
      variants: [],
      images: [],
    },
  };

  // 3️⃣ Sort variants
  const option1Order = template?.options?.option1?.values || [];
  const option2Order = template?.options?.option2?.values || [];
  const option3Order = template?.options?.option3?.values || [];

  variants.sort((a, b) => {
    const idx1 = option1Order.indexOf(a.option1Value);
    const idx2 = option1Order.indexOf(b.option1Value);
    if (idx1 !== idx2) return (idx1 === -1 ? 9999 : idx1) - (idx2 === -1 ? 9999 : idx2);

    const idx1_2 = option2Order.indexOf(a.option2Value);
    const idx2_2 = option2Order.indexOf(b.option2Value);
    if (idx1_2 !== idx2_2) return (idx1_2 === -1 ? 9999 : idx1_2) - (idx2_2 === -1 ? 9999 : idx2_2);

    const idx1_3 = option3Order.indexOf(a.option3Value);
    const idx2_3 = option3Order.indexOf(b.option3Value);
    return (idx1_3 === -1 ? 9999 : idx1_3) - (idx2_3 === -1 ? 9999 : idx2_3);
  });

  // 4️⃣ Map options and push variants
  const optionMap: any = {};
  const existingOptionCombos = new Set(); // to prevent duplicate combinations

  for (const v of variants) {
    if (v.status !== 1 || v.quantity <= 0) continue;

    const variantKey = `${v.option1Value || ''}/${v.option2Value || ''}/${v.option3Value || ''}`;
    if (existingOptionCombos.has(variantKey)) {
      continue;
    }
    existingOptionCombos.add(variantKey);

    const sku = v.custom_variant_id || `${inventory.skuNumber}-${v.option1Value || ''}-${v.option2Value || ''}`;

    payload.product.variants.push({
      sku,
      fulfillment_service: 'manual',
      inventory_management: 'shopify',
      inventory_quantity: v.quantity,
      price: String(v.price),
      weight: v.weight || 0,
      requires_shipping: true,
      taxable: v.price >= (template?.taxThreshold || 0) && template?.isChargeTax,
      barcode: isWeb ? v.web_barcode : v.barcode,
      option1: v.option1Value || null,
      option2: v.option2Value || null,
      option3: v.option3Value || null,
      cost: (v.user?.firstName + ' ' + v.user?.lastName).trim() === 'Store Account' ? String(v.cost) : String(v.payout),
    });

    // Build option map
    if (v.option1 && v.option1Value) {
      optionMap[v.option1] = optionMap[v.option1] || new Set();
      optionMap[v.option1].add(v.option1Value);
    }
    if (v.option2 && v.option2Value) {
      optionMap[v.option2] = optionMap[v.option2] || new Set();
      optionMap[v.option2].add(v.option2Value);
    }
    if (v.option3 && v.option3Value) {
      optionMap[v.option3] = optionMap[v.option3] || new Set();
      optionMap[v.option3].add(v.option3Value);
    }
  }

  // 5️⃣ Build Shopify options
  Object.entries(optionMap).forEach(([name, values]: [string, any]) => {
    payload.product.options.push({ name, values: Array.from(values) });
  });

  // 6️⃣ Images
  if (inventory.image) {
    const imageUrls = inventory.image
      .split(',')
      .map((i: string) => i.trim())
      .filter(Boolean);
    payload.product.images = imageUrls.map((src: string) => ({ src }));
  }

  return payload;
}
