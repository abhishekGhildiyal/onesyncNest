import {
  ALIASES,
  INVENTORY_FIELDS,
  SHOPIFY_ACTION,
  SHOPIFY_SYNC_FIELDS,
  VARIANT_FIELDS,
  VARIANT_STATUS,
} from 'src/common/constants/inventory-update-fields';
import { isSamePurchaseDateValue } from './inventory-audit-diff';

export const toKey = (key: string) => ALIASES[key] || key;

const VARIANT_ROW_FIELD: Record<string, string> = {
  purchaseDate: 'purchase_date',
  paymentForm: 'payment_form',
  purchaseFromVendor: 'purchase_from_vendor',
  vendorOrderNo: 'vendor_order_no',
  localOrderNo: 'local_order_no',
  itemTags: 'item_tags',
  variantImage: 'variant_image',
  storeLocationMappingId: 'store_location_mapping_id',
  channelId: 'channel_id',
  soldSource: 'sold_source',
};

export const readRowField = (row: Record<string, unknown> | null | undefined, canonicalKey: string) => {
  if (!row) return undefined;
  const dbKey = VARIANT_ROW_FIELD[canonicalKey];
  if (row[canonicalKey] !== undefined) return row[canonicalKey];
  if (dbKey && row[dbKey] !== undefined) return row[dbKey];
  return undefined;
};

export const snapshotRow = <T>(row: T): T => (row ? JSON.parse(JSON.stringify(row)) : row);

export const isStatusSentinel = (val: unknown) => Number(val) === -1;

export const isKnownField = (key: string) => INVENTORY_FIELDS.has(key) || VARIANT_FIELDS.has(key);

export const isInventoryField = (key: string) => INVENTORY_FIELDS.has(toKey(key));

export const isVariantField = (key: string) => VARIANT_FIELDS.has(toKey(key));

export const same = (a: unknown, b: unknown) => {
  if (a === b) return true;
  if (a == null && b == null) return true;
  const na = Number(a);
  const nb = Number(b);
  if (Number.isFinite(na) && Number.isFinite(nb) && na === nb) return true;
  if (a instanceof Date || b instanceof Date) {
    return new Date(a as string | Date).getTime() === new Date(b as string | Date).getTime();
  }
  if (typeof a === 'object' || typeof b === 'object') {
    return JSON.stringify(a) === JSON.stringify(b);
  }
  return String(a) === String(b);
};

export const resolveVariantIncoming = (incoming: Record<string, unknown>) => {
  const raw = incoming?.variant ?? incoming?.variants;
  const base = Array.isArray(raw) ? raw[0] : raw;
  const variantIncoming =
    base && typeof base === 'object' ? { ...(base as Record<string, unknown>) } : {};

  for (const key of VARIANT_FIELDS) {
    if (key === 'customFields' || variantIncoming[key] !== undefined) continue;
    const rootVal = incoming?.[key];
    if (rootVal !== undefined) variantIncoming[key] = rootVal;
  }

  return variantIncoming;
};

export const collectIncomingPatchFields = (
  incoming: Record<string, unknown>,
  variantIncoming: Record<string, unknown>,
  fieldSet: Set<string>,
) => {
  const patched = new Set<string>();
  const scan = (obj: Record<string, unknown> | null | undefined) => {
    if (!obj || typeof obj !== 'object') return;
    for (const [rawKey, val] of Object.entries(obj)) {
      if (rawKey === 'id' || rawKey === 'channelObj' || rawKey === 'variant' || rawKey === 'variants') continue;
      if (val === undefined) continue;
      const key = toKey(rawKey);
      if (key === 'status' && isStatusSentinel(val)) continue;
      if (fieldSet.has(key)) patched.add(key);
    }
  };
  scan(variantIncoming);
  scan(incoming);
  return patched;
};

export const diffSavedChanges = (
  before: Record<string, unknown>,
  after: Record<string, unknown>,
  fieldSet: Set<string>,
) => {
  const changed = new Set<string>();
  if (!before || !after || !fieldSet?.size) return changed;

  for (const key of fieldSet) {
    if (key === 'customFields') continue;
    const prev = readRowField(before, key) ?? before[key];
    const next = readRowField(after, key) ?? after[key];

    if (key === 'purchaseDate') {
      if (!isSamePurchaseDateValue(prev, next)) changed.add(key);
      continue;
    }

    if (!same(prev, next)) changed.add(key);
  }

  return changed;
};

export const diffChangedFields = (existing: Record<string, unknown>, incoming: Record<string, unknown>) => {
  const changed = new Set<string>();
  if (!incoming || typeof incoming !== 'object') return changed;

  for (const [rawKey, nextVal] of Object.entries(incoming)) {
    if (rawKey === 'id') continue;
    if (nextVal === undefined) continue;

    const key = toKey(rawKey);
    if (!isKnownField(key)) continue;
    if (key === 'status' && isStatusSentinel(nextVal)) continue;

    const prevVal = readRowField(existing, key) ?? existing?.[key] ?? existing?.[rawKey];

    if (key === 'purchaseDate') {
      if (!isSamePurchaseDateValue(prevVal, nextVal)) changed.add(key);
      continue;
    }

    if (!same(prevVal, nextVal)) changed.add(key);
  }

  return changed;
};

export const isActiveForShopify = (variant: Record<string, unknown>) =>
  Number(variant?.status) === VARIANT_STATUS.ACTIVE && Number(variant?.quantity ?? 0) > 0;

export const resolveShopifyAction = ({
  changedFields,
  newState,
  oldVariantStatus,
  store,
  roleId,
}: {
  changedFields: Set<string>;
  newState: { inventory?: Record<string, unknown>; variant?: Record<string, unknown> };
  oldVariantStatus: number;
  store: Record<string, unknown>;
  roleId: number;
}) => {
  if (!store?.shopify_store || !store?.shopify_token) return SHOPIFY_ACTION.NONE;
  if (roleId === 2) return SHOPIFY_ACTION.NONE;
  if (!changedFields?.size) return SHOPIFY_ACTION.NONE;

  const inv = newState?.inventory || {};
  const variant = newState?.variant || {};
  const newStatus = Number(variant?.status);
  const oldStatus = Number(oldVariantStatus);
  const statusChanged = changedFields.has('status');

  if (changedFields.has('isVisible') && inv.isVisible === false) {
    return SHOPIFY_ACTION.DELETE;
  }

  const isUniqueProductStore =
    store.is_unique_product_store ?? store.isUniqueProductStore ?? false;
  if (isUniqueProductStore && changedFields.has('linkedImage') && inv.linkedImage === false) {
    return SHOPIFY_ACTION.DELETE;
  }

  if (statusChanged && oldStatus === VARIANT_STATUS.ACTIVE && newStatus !== VARIANT_STATUS.ACTIVE) {
    return SHOPIFY_ACTION.DELETE;
  }

  if (statusChanged && newStatus === VARIANT_STATUS.ACTIVE && oldStatus !== VARIANT_STATUS.ACTIVE) {
    return SHOPIFY_ACTION.RESYNC;
  }

  if (newStatus === VARIANT_STATUS.ACTIVE && isActiveForShopify(variant)) {
    for (const key of changedFields) {
      if (key === 'status') continue;
      if (SHOPIFY_SYNC_FIELDS.has(key)) return SHOPIFY_ACTION.RESYNC;
    }
  }

  return SHOPIFY_ACTION.NONE;
};

/** Coerce legacy/null DB values before Sequelize save (payout is NOT NULL in DB). */
export const normalizeVariantNotNullDefaults = (variant: { get: (k: string) => unknown; set: (k: string, v: unknown) => void }) => {
  if (variant.get('payout') == null) variant.set('payout', 0);
  const payoutManual = variant.get('payoutManual') ?? variant.get('payout_manual');
  if (payoutManual == null) variant.set('payoutManual', '0');
};

export const formatUpdateError = (err: {
  name?: string;
  message?: string;
  errors?: { path?: string; message?: string }[];
}) => {
  if (err?.name === 'SequelizeValidationError' || err?.name === 'ValidationError') {
    const details = err.errors
      ?.map((e) => `${e.path || 'field'}: ${e.message}`)
      .filter(Boolean)
      .join('; ');
    return details || err.message || 'Validation error';
  }
  return err?.message || 'Update failed';
};
