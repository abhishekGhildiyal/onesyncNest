/**
 * Shared L1 helpers for normal + web-only stores.
 *
 * Inclusion rules:
 *   - Rows without shopify_id are synced only when they have active variants (status=1, qty>0).
 *   - Rows that already have shopify_id are always included (updates + unlist when qty drops).
 *   - Catalog web row (published_scope=web, linked_image=false) is included when any linked
 *     global or its own variants are active — not when only dead globals exist.
 */
import { isActiveVariant, isLinkedImageFlag } from '../shopify-sync-utils';

export const activeVariants = (variants: any[] = []) => variants.filter((v) => isActiveVariant(v));

/** Linked catalog: active if any linked global OR the catalog web row has sellable variants. */
/** Linked globals only — unique items have their own web and do not feed the catalog. */
const catalogHasActiveVariants = (rows: any[], catalogWeb: any) => {
  const linkedGlobals = rows.filter(
    (g) => g.publishedScope === 'global' && !isLinkedImageFlag(g.linkedImage),
  );
  if (linkedGlobals.some((g) => activeVariants(g?.variants || []).length > 0)) return true;
  if (catalogWeb) return activeVariants(catalogWeb?.variants || []).length > 0;
  return false;
};

export const shouldIncludeInventory = (
  inv: any,
  rows: any[],
  catalogWeb: any,
  idFilter: Set<number> | null,
) => {
  if (idFilter && !idFilter.has(Number(inv.id))) return false;
  const hasActive =
    inv === catalogWeb
      ? catalogHasActiveVariants(rows, catalogWeb)
      : activeVariants(inv?.variants || []).length > 0;
  if (!inv.shopifyId) return hasActive;
  return true;
};

/** Single catalog web row for linked products (not unique-item web companions). */
export const findCatalogWeb = (rows: any[]) =>
  rows.find((i) => i.publishedScope === 'web' && !isLinkedImageFlag(i.linkedImage));
