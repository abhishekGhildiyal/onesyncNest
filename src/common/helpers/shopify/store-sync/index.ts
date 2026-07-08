import { isItemLevelStore, resolveStoreSyncType, StoreSyncType } from '../shopify-sync-utils';
import { syncNormalStore, resolveDbEntries as resolveNormalDbEntries } from './normal-store.sync';
import { syncItemLevelStore, resolveDbEntries as resolveItemLevelDbEntries } from './item-level-store.sync';
import { syncWebOnlyStore, resolveDbEntries as resolveWebOnlyDbEntries } from './web-only-store.sync';
import { syncUsedOnlyStore, resolveDbEntries as resolveUsedOnlyDbEntries } from './used-only-store.sync';
import { StoreSyncContext, DbEntrySelectionContext } from './sync-executor.helper';

export type { StoreSyncContext, DbEntrySelectionContext, ListingPass } from './sync-executor.helper';

export function resolveDbEntriesForStore(ctx: DbEntrySelectionContext) {
  if (isItemLevelStore(ctx.store)) {
    return resolveItemLevelDbEntries(ctx);
  }
  switch (resolveStoreSyncType(ctx.store)) {
    case StoreSyncType.WEB_ONLY:
      return resolveWebOnlyDbEntries(ctx);
    case StoreSyncType.USED_ONLY:
      return resolveUsedOnlyDbEntries(ctx);
    default:
      return resolveNormalDbEntries(ctx);
  }
}

export async function runStoreSync(ctx: StoreSyncContext) {
  if (isItemLevelStore(ctx.store)) {
    return syncItemLevelStore(ctx);
  }
  switch (resolveStoreSyncType(ctx.store)) {
    case StoreSyncType.WEB_ONLY:
      return syncWebOnlyStore(ctx);
    case StoreSyncType.USED_ONLY:
      return syncUsedOnlyStore(ctx);
    default:
      return syncNormalStore(ctx);
  }
}
