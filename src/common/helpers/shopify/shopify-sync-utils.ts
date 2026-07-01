/**
 * Store + scope helpers for Shopify sync (Java ProductListServiceImpl parity).
 */

export function coerceStoreFlag(value: unknown): boolean {
  if (value === true || value === 1 || value === '1') return true;
  if (typeof Buffer !== 'undefined' && Buffer.isBuffer(value)) return value[0] === 1;
  return false;
}

/** Standard store — catalog web + global POS (!is_web_store && !is_used_only). */
export function isNormalStore(store: {
  is_web_store?: boolean;
  is_used_only_products_store?: boolean;
} | null | undefined) {
  if (!store) return false;
  return !coerceStoreFlag(store.is_web_store) && !coerceStoreFlag(store.is_used_only_products_store);
}

export function isUniqueProductStore(store: { is_unique_product_store?: boolean } | null | undefined) {
  return coerceStoreFlag(store?.is_unique_product_store);
}

/** Reserved — NOT is_unique_product_store (Java parity). */
export function isItemLevelStore() {
  return false;
}

export const StoreSyncType = {
  NORMAL: 'normal',
  WEB_ONLY: 'web_only',
  USED_ONLY: 'used_only',
} as const;

export type StoreSyncType = (typeof StoreSyncType)[keyof typeof StoreSyncType];

export function resolveStoreSyncType(store: {
  is_web_store?: boolean;
  is_used_only_products_store?: boolean;
} | null | undefined): StoreSyncType {
  if (!store) return StoreSyncType.NORMAL;
  if (coerceStoreFlag(store.is_web_store)) return StoreSyncType.WEB_ONLY;
  if (coerceStoreFlag(store.is_used_only_products_store)) return StoreSyncType.USED_ONLY;
  return StoreSyncType.NORMAL;
}

export function isLinkedImageFlag(value: unknown): boolean {
  return value === true || value === 1 || value === '1';
}

/** Unique item: global + linked_image — own web on Shopify, not part of catalog web. */
export function isUniqueGlobalInventory(inventory: { publishedScope?: string; linkedImage?: unknown } | null | undefined) {
  return inventory?.publishedScope === 'global' && isLinkedImageFlag(inventory?.linkedImage);
}

/** Only status = 1 with stock is eligible for Shopify sync. */
export function isActiveVariant(variant: { status?: unknown; quantity?: unknown }) {
  return Number(variant?.status) === 1 && Number(variant?.quantity ?? 0) > 0;
}

/** True when a global unique item has a companion web inventory row (unique-product-store pairs). */
export function hasPairedWebInventory(
  inventory: { publishedScope?: string; linkedImage?: boolean; webBarcode?: string | null },
  allInventories: any[] = [],
) {
  if (!inventory?.webBarcode || !isLinkedImageFlag(inventory?.linkedImage)) return false;
  return allInventories.some(
    (row) =>
      row !== inventory &&
      row.publishedScope === 'web' &&
      isLinkedImageFlag(row.linkedImage) &&
      row.webBarcode === inventory.webBarcode,
  );
}

/** Web row in DB, or used-only store globals. */
export function resolveIsWebSync(
  inventory: { publishedScope?: string },
  store: { is_used_only_products_store?: boolean },
) {
  if (inventory?.publishedScope === 'web') return true;
  if (coerceStoreFlag(store?.is_used_only_products_store)) return true;
  return false;
}
