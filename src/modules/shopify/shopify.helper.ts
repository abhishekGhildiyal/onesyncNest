/**
 * Shopify payload builder — Express shopifyHelpers.js parity.
 */

import {
  coerceStoreFlag,
  isActiveVariant,
  isLinkedImageFlag,
  isNormalStore,
  isUniqueGlobalInventory,
  resolveIsWebSync,
} from 'src/common/helpers/shopify/shopify-sync-utils';

export { resolveIsWebSync } from 'src/common/helpers/shopify/shopify-sync-utils';

export function sanitizeHandle(handle: string): string | undefined {
  if (!handle) return undefined;
  return handle
    .toLowerCase()
    .replace(/[^a-z0-9\-]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

/** Unique-store POS + web companions share displayName — scope suffix keeps Shopify handles distinct. */
export function resolveShopifyHandle(
  inventory: any,
  store: any,
  options: { allInventories?: any[]; isWeb?: boolean; webOnlyGroupKey?: string } = {},
) {
  const base = sanitizeHandle(inventory?.displayName || inventory?.itemName);
  if (!base) return undefined;

  const rows = options.allInventories ?? [];

  if (coerceStoreFlag(store?.is_web_store) && options.webOnlyGroupKey) {
    const [size, price] = String(options.webOnlyGroupKey).split('|');
    const pricePart = String(price ?? '').replace(/\./g, '_');
    const sizePart = sanitizeHandle(size) || 'one-size';
    return sanitizeHandle(`${base}-p${pricePart}-s${sizePart}`) || `${base}-p${pricePart}-s${sizePart}`;
  }

  const dualListing = isNormalStore(store) && isUniqueGlobalInventory(inventory);

  if (dualListing) {
    const suffix = options.isWeb ? 'web' : 'pos';
    return sanitizeHandle(`${base}-${suffix}`) || `${base}-${suffix}`;
  }

  return base;
}

function parseImageUrlList(value: unknown) {
  if (!value) return [];
  return String(value)
    .split(',')
    .map((i) => i.trim())
    .filter(Boolean);
}

function resolveListingImageUrls(inventory: any, variants: any[] = []) {
  const useVariantImages =
    isLinkedImageFlag(inventory?.linkedImage) ||
    variants.some((v) => isLinkedImageFlag(v?.linkedImage));

  if (useVariantImages) {
    for (const variant of variants) {
      const urls = parseImageUrlList(variant?.variantImage ?? variant?.variant_image);
      if (urls.length) return urls;
    }
  }

  return parseImageUrlList(inventory?.image);
}

export function buildShopifyPayload(
  inventory: any,
  variants: any[] = [],
  store: any,
  template: any,
  options: {
    allInventories?: any[];
    isWeb?: boolean;
    groupQty?: number;
    webOnlyGroupKey?: string;
  } = {},
) {
  const rows = options.allInventories ?? [];
  const dualListing = isNormalStore(store) && isUniqueGlobalInventory(inventory);

  const isWeb = options.isWeb ?? resolveIsWebSync(inventory, store);
  const auctionEnabled = coerceStoreFlag(inventory?.auctionEnabled ?? inventory?.auction_enabled);

  const tagParts = new Set<string>();
  tagParts.add('OSM');

  const hasGoatApp = store?.is_goat_app_installed ?? store?.isGoatAppInstalled;
  const isStadiumGoods = store?.is_stadium_goods ?? store?.isStadiumGoods;

  if (isWeb) {
    tagParts.add('OSW');
    if (hasGoatApp) tagParts.add('gsync');

    const allVariantsNew =
      variants.length > 0 &&
      variants.every((v) => {
        const condition = (v.option2Value || '').toLowerCase();
        return !condition || condition === 'new';
      });

    if (isStadiumGoods && allVariantsNew) tagParts.add('stadiumgoods');
  } else {
    tagParts.add('OSP');
    if (hasGoatApp) tagParts.add('gexclude');
  }

  const dbTags = inventory?.productList?.tags || [];
  dbTags.forEach((t: any) => {
    if ((isWeb && t.web) || (!isWeb && t.pos)) {
      if (t.input) tagParts.add(t.input.trim());
    }
  });

  variants.forEach((v) => {
    if (v.itemTags) {
      v.itemTags.split(',').forEach((tag: string) => {
        const trimmed = tag.trim();
        if (trimmed) tagParts.add(trimmed);
      });
    }
  });

  if (auctionEnabled) {
    tagParts.add('dropping');
    tagParts.add('no_buy_btn');
  }

  const tags = Array.from(tagParts).join(', ');

  const virtualWebHalf = dualListing && isWeb;
  const shopifyProductId = virtualWebHalf ? undefined : inventory.shopifyId || undefined;

  const payload: any = {
    product: {
      id: shopifyProductId,
      title: inventory.displayName || inventory.itemName,
      handle: resolveShopifyHandle(inventory, store, { ...options, isWeb }),
      body_html: inventory.productList?.description || inventory.description || '',
      vendor: inventory.brand,
      product_type: inventory.type,
      status: 'active',
      published_scope: isWeb ? 'web' : 'global',
      published: isWeb,
      tags,
      options: [],
      variants: [],
      images: [],
    },
  };

  const option1Order = template?.options?.option1?.values || [];
  const option2Order = template?.options?.option2?.values || [];
  const option3Order = template?.options?.option3?.values || [];

  const sortedVariants = [...variants].sort((a, b) => {
    const idx1 = option1Order.indexOf(a.option1Value);
    const idx2 = option1Order.indexOf(b.option1Value);
    if (idx1 !== idx2) return (idx1 === -1 ? 9999 : idx1) - (idx2 === -1 ? 9999 : idx2);

    const idx1_2 = option2Order.indexOf(a.option2Value);
    const idx2_2 = option2Order.indexOf(b.option2Value);
    if (idx1_2 !== idx2_2) {
      return (idx1_2 === -1 ? 9999 : idx1_2) - (idx2_2 === -1 ? 9999 : idx2_2);
    }

    const idx1_3 = option3Order.indexOf(a.option3Value);
    const idx2_3 = option3Order.indexOf(b.option3Value);
    return (idx1_3 === -1 ? 9999 : idx1_3) - (idx2_3 === -1 ? 9999 : idx2_3);
  });

  const optionMap: Record<string, Set<string>> = {};
  const existingOptionCombos = new Set<string>();

  const templateOption1Name = template?.options?.option1?.name || null;
  const templateOption2Name = template?.options?.option2?.name || null;
  const templateOption3Name = template?.options?.option3?.name || null;

  const sampleVariant =
    sortedVariants.find((variant) => variant.option1 || variant.option2 || variant.option3) ||
    sortedVariants[0];
  const resolvedOpt1Name = sampleVariant?.option1 || templateOption1Name;
  const resolvedOpt2Name = sampleVariant?.option2 || templateOption2Name;
  const resolvedOpt3Name = sampleVariant?.option3 || templateOption3Name;

  for (const v of sortedVariants) {
    if (!isActiveVariant(v)) continue;

    const opt1Name = v.option1 || resolvedOpt1Name;
    const opt2Name = v.option2 || resolvedOpt2Name;
    const opt3Name = v.option3 || resolvedOpt3Name;
    const opt1Val = v.option1Value != null && String(v.option1Value).trim() !== '' ? v.option1Value : null;
    const opt2Val = v.option2Value != null && String(v.option2Value).trim() !== '' ? v.option2Value : null;
    const opt3Val = v.option3Value != null && String(v.option3Value).trim() !== '' ? v.option3Value : null;

    const variantKey = `${opt1Val || ''}/${opt2Val || ''}/${opt3Val || ''}`;
    if (existingOptionCombos.has(variantKey)) {
      console.log(`⚠️ Skipping duplicate variant combination: ${variantKey}`);
      continue;
    }
    existingOptionCombos.add(variantKey);

    const sku = inventory.skuNumber;

    let barcode = isWeb ? v.web_barcode : v.barcode;
    if (!isWeb && (!barcode || !String(barcode).trim())) {
      if (store?.prefer_migration_id && v.migrationId) {
        barcode = String(v.migrationId).trim();
      } else if (store?.preferMigrationId && v.migrationId) {
        barcode = String(v.migrationId).trim();
      }
    }

    const variantPrice = auctionEnabled ? 0 : v.price;

    const shopifyVariant: any = {
      sku,
      fulfillment_service: 'manual',
      inventory_management: 'shopify',
      inventory_quantity: options.groupQty != null ? options.groupQty : 1,
      price: String(variantPrice),
      compare_at_price: isWeb ? v.compare_at_price : undefined,
      weight: v.weight || 0,
      requires_shipping: true,
      taxable:
        !auctionEnabled && variantPrice >= (template?.taxThreshold || 0) && template?.isChargeTax,
      barcode,
      cost: v.accountType === 1 ? String(v.cost) : String(v.payout),
    };

    if (opt1Val) {
      shopifyVariant.option1 = opt1Val;
      if (opt1Name) {
        optionMap[opt1Name] = optionMap[opt1Name] || new Set();
        optionMap[opt1Name].add(opt1Val);
      }
    }
    if (opt2Val) {
      shopifyVariant.option2 = opt2Val;
      if (opt2Name) {
        optionMap[opt2Name] = optionMap[opt2Name] || new Set();
        optionMap[opt2Name].add(opt2Val);
      }
    }
    if (opt3Val) {
      shopifyVariant.option3 = opt3Val;
      if (opt3Name) {
        optionMap[opt3Name] = optionMap[opt3Name] || new Set();
        optionMap[opt3Name].add(opt3Val);
      }
    }

    payload.product.variants.push(shopifyVariant);
  }

  const orderedOptionNames = [resolvedOpt1Name, resolvedOpt2Name, resolvedOpt3Name].filter(Boolean);
  const seenOptionNames = new Set<string>();

  for (const name of orderedOptionNames) {
    const values = optionMap[name];
    if (!values?.size || seenOptionNames.has(name)) continue;
    seenOptionNames.add(name);
    payload.product.options.push({ name, values: Array.from(values) });
  }

  for (const [name, values] of Object.entries(optionMap)) {
    if (!values.size || seenOptionNames.has(name)) continue;
    seenOptionNames.add(name);
    payload.product.options.push({ name, values: Array.from(values) });
  }

  if (!payload.product.variants.length) {
    console.warn(
      `⚠️ buildShopifyPayload: no variants to sync for inventory ${inventory.id} (product ${inventory.productId})`,
    );
  }

  const imageUrls = resolveListingImageUrls(inventory, variants);
  payload.product.images = imageUrls.map((src) => ({ src }));

  return payload;
}
