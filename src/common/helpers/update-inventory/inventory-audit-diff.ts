import { VARIANT_STATUS } from 'src/common/constants/inventory-update-fields';

export const STATUS_LABELS: Record<number, string> = {
  [VARIANT_STATUS.INACTIVE]: 'Inactive',
  [VARIANT_STATUS.ACTIVE]: 'Active',
  [VARIANT_STATUS.SOLD]: 'Sold',
  [VARIANT_STATUS.PAID]: 'Paid',
  [VARIANT_STATUS.NEEDS_APPROVAL]: 'Needs Approval',
  [VARIANT_STATUS.WITHDRAWAL_REQUESTED]: 'Withdrawal Requested',
  [VARIANT_STATUS.WITHDRAWN]: 'Withdrawn',
  [VARIANT_STATUS.REJECTED]: 'Rejected',
  [VARIANT_STATUS.DELETED]: 'Deleted',
  [VARIANT_STATUS.IN_TRANSFER]: 'In-Transfer',
};

const IGNORED_FIELDS = new Set([
  'id',
  'createdon', 'updateon', 'deletedat',
  'createdby', 'updatedby',
  'store', 'storeid',
  'user', 'userid', 'username', 'userlastname',
  'inventory', 'password', 'productlist',
  'product', 'handle', 'title', 'bodyhtml',
  'tags', 'acceptedon', 'soldon', 'quantity',
  'sourcename', 'soldsource', 'accounttype',
  'locationid', 'payoutmanual', 'isprintqueue', 'printqueuelabeltype', 'lastlabelprintdate',
  'itemid', 'skunumber', 'publishedscope', 'shopifystatus', 'shopifyid',
]);

const extractFieldName = (key: string) => {
  if (!key) return '';
  const idx = key.lastIndexOf('.');
  return idx >= 0 ? key.slice(idx + 1) : key;
};

const mapVariantStatus = (val: unknown) => {
  if (val == null) return null;
  const status = Number(val);
  return STATUS_LABELS[status] ?? (Number.isFinite(status) ? 'Active' : String(val));
};

const normalizeValue = (value: unknown) => {
  if (value == null) return null;
  if (value instanceof Date) {
    return Number.isNaN(value.getTime()) ? null : value.toISOString().replace(/\.\d{3}Z$/, '');
  }
  return value;
};

export const normalizeAuditPurchaseDate = (value: unknown): string | null => {
  if (value == null) return null;
  if (value instanceof Date) {
    if (Number.isNaN(value.getTime())) return null;
    const y = value.getUTCFullYear();
    const m = String(value.getUTCMonth() + 1).padStart(2, '0');
    const d = String(value.getUTCDate()).padStart(2, '0');
    return `${y}-${m}-${d}`;
  }

  const s = String(value).trim();
  if (!s) return null;

  const dateOnly = s.match(/^(\d{4}-\d{2}-\d{2})/);
  return dateOnly ? dateOnly[1] : s;
};

export const isSamePurchaseDateValue = (left: unknown, right: unknown) => {
  const leftDay = normalizeAuditPurchaseDate(left);
  const rightDay = normalizeAuditPurchaseDate(right);
  if (!leftDay && !rightDay) return true;
  if (!leftDay || !rightDay) return false;
  return leftDay === rightDay;
};

const isMissing = (val: unknown) => val == null || (typeof val === 'string' && val.trim() === '');

const flattenObject = (obj: unknown, prefix = '', result: Record<string, unknown> = {}) => {
  if (obj == null || typeof obj !== 'object') return result;

  for (const [rawKey, value] of Object.entries(obj as Record<string, unknown>)) {
    const key = prefix ? `${prefix}.${rawKey}` : rawKey;

    if (rawKey === 'customFields' && Array.isArray(value)) {
      for (const cf of value) {
        const fieldName = cf?.definition?.fieldName || cf?.fieldName;
        if (!fieldName) continue;
        result[fieldName] = cf?.fieldValue == null ? null : String(cf.fieldValue);
      }
      continue;
    }

    if (rawKey === 'channelObj' && value && typeof value === 'object') {
      const channelObj = value as Record<string, unknown>;
      const isShopify =
        channelObj.isShopifyChannel === true ||
        channelObj.is_shopify_channel === 1 ||
        channelObj.is_shopify_channel === true;
      result[`${prefix ? `${prefix}.` : ''}salesChannel`] = isShopify
        ? (channelObj.displayName ?? channelObj.channelName ?? null)
        : (channelObj.channelName ?? channelObj.displayName ?? null);
      continue;
    }

    if (rawKey === 'storeLocationMapping' && value && typeof value === 'object') {
      result[`${prefix ? `${prefix}.` : ''}storeLocation`] = (value as Record<string, unknown>).name ?? null;
      continue;
    }

    if (Array.isArray(value)) {
      value.forEach((item, index) => {
        if (item && typeof item === 'object') {
          flattenObject(item, `${key}.${index}`, result);
        } else {
          result[`${key}.${index}`] = normalizeValue(item);
        }
      });
      continue;
    }

    if (value && typeof value === 'object') {
      flattenObject(value, key, result);
      continue;
    }

    result[key] = normalizeValue(value);
  }

  return result;
};

const extractVariantOptionNames = (obj: Record<string, unknown>) => {
  const labels: Record<string, string> = {};
  const variants = obj?.variant;
  if (!Array.isArray(variants) || !variants.length) return labels;

  const first = variants[0] as Record<string, unknown>;
  if (first?.option1) labels.option1Value = String(first.option1);
  if (first?.option2) labels.option2Value = String(first.option2);
  if (first?.option3) labels.option3Value = String(first.option3);
  return labels;
};

const prettifyKey = (raw: string, variantLabels: Record<string, string>) => {
  if (!raw) return '';

  let clean = raw.replace(/\.\d+/g, '');
  for (const [from, to] of Object.entries(variantLabels)) {
    if (clean.includes(from)) clean = clean.replace(from, to);
  }

  clean = clean.replace(/variant/gi, '').replace(/inventory/gi, '').replace(/\./g, ' ').trim();

  return clean
    .split(/\s+/)
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(' ');
};

export const getInventoryAuditChanges = (
  oldObj: Record<string, unknown> | null,
  newObj: Record<string, unknown> | null,
) => {
  const diffResult: Record<string, { old: unknown; new: unknown }> = {};
  if (oldObj == null && newObj == null) return diffResult;

  const oldMap = flattenObject(oldObj);
  const newMap = flattenObject(newObj);
  const variantLabels = extractVariantOptionNames(newObj || {});
  const allKeys = new Set([...Object.keys(oldMap), ...Object.keys(newMap)]);

  for (const key of allKeys) {
    const lowerKey = key.toLowerCase();
    const lastSegment = extractFieldName(key).toLowerCase();

    if (
      lowerKey.startsWith('user.') ||
      lowerKey.includes('.user.') ||
      lowerKey.startsWith('inventory.user.') ||
      lowerKey.startsWith('variant.user.')
    ) {
      continue;
    }

    if (IGNORED_FIELDS.has(lastSegment) || lowerKey.includes('shopifystatus')) continue;

    let oldVal = oldMap[key];
    let newVal = newMap[key];

    if (lastSegment === 'purchasedate') {
      oldVal = normalizeAuditPurchaseDate(oldVal);
      newVal = normalizeAuditPurchaseDate(newVal);
    }

    if (lowerKey.includes('variant') && lowerKey.endsWith('status')) {
      oldVal = mapVariantStatus(oldVal);
      newVal = mapVariantStatus(newVal);
    }

    const oldMissing = isMissing(oldVal);
    const newMissing = isMissing(newVal);

    if (oldMissing && newMissing) continue;
    if (!oldMissing && !newMissing && Object.is(oldVal, newVal)) continue;
    if (!oldMissing && !newMissing && String(oldVal) === String(newVal)) continue;

    let pretty = prettifyKey(key, variantLabels);
    if (!pretty) pretty = 'Status';

    diffResult[pretty] = {
      old: oldMissing ? null : oldVal,
      new: newMissing ? null : newVal,
    };
  }

  return diffResult;
};
