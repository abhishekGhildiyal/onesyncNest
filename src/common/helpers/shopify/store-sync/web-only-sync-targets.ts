import { isLinkedImageFlag } from '../shopify-sync-utils';
import { activeVariants } from './db-entry-selection';

/** Same size + same price → one Shopify web listing (qty = count of matching globals). */
export const groupKeyFromVariant = (variant: any) => {
  const price = Number(variant?.price ?? 0);
  const size = String(variant?.option1Value ?? '').trim();
  return `${size}|${price}`;
};

export type WebOnlySyncTarget = {
  type: 'unique' | 'linked_group';
  inventory: any;
  groupQty: number;
  webOnlyGroupKey: string | null;
  groupMembers?: any[];
};

/**
 * Web-only sync targets (spec table):
 *   Linked — group global rows by price + size → one web product per group.
 *   Unique — each global (linked_image=true) → its own web product.
 */
export function buildWebOnlySyncTargets(
  activeInventories: any[],
  inventoryIdFilter: Set<number> | null = null,
): WebOnlySyncTarget[] {
  const idFilter = inventoryIdFilter?.size ? inventoryIdFilter : null;
  const targets: WebOnlySyncTarget[] = [];

  for (const inv of activeInventories) {
    if (inv.publishedScope !== 'global' || !isLinkedImageFlag(inv.linkedImage)) continue;
    if (idFilter && !idFilter.has(Number(inv.id))) continue;
    const variants = activeVariants(inv?.variants || []);
    if (!inv.shopifyId && !variants.length) continue;
    targets.push({
      type: 'unique',
      inventory: inv,
      groupQty: 1,
      webOnlyGroupKey: null,
    });
  }

  const groups = new Map<string, { inv: any; variant: any }[]>();
  for (const inv of activeInventories) {
    if (inv.publishedScope !== 'global' || isLinkedImageFlag(inv.linkedImage)) continue;
    if (idFilter && !idFilter.has(Number(inv.id))) continue;

    const variant = activeVariants(inv?.variants || [])[0];
    if (!inv.shopifyId && !variant) continue;

    const key = variant ? groupKeyFromVariant(variant) : `unknown|${inv.id}`;
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key)!.push({ inv, variant });
  }

  for (const [groupKey, members] of groups) {
    const activeMembers = members.filter((m) => m.variant || m.inv.shopifyId);
    if (!activeMembers.length) continue;

    const representative = activeMembers[0].inv;
    targets.push({
      type: 'linked_group',
      inventory: representative,
      groupMembers: activeMembers.map((m) => m.inv),
      groupQty: activeMembers.filter((m) => m.variant).length || activeMembers.length,
      webOnlyGroupKey: groupKey,
    });
  }

  return targets;
}
