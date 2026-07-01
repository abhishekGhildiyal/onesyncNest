import { resolveStoreSyncType, StoreSyncType } from '../shopify-sync-utils';
import { syncNormalStore, resolveDbEntries as resolveNormalDbEntries } from './normal-store.sync';
import { syncWebOnlyStore, resolveDbEntries as resolveWebOnlyDbEntries } from './web-only-store.sync';
import { syncUsedOnlyStore, resolveDbEntries as resolveUsedOnlyDbEntries } from './used-only-store.sync';
import { StoreSyncContext, DbEntrySelectionContext } from './sync-executor.helper';

export type { StoreSyncContext, DbEntrySelectionContext, ListingPass } from './sync-executor.helper';

export function resolveDbEntriesForStore(ctx: DbEntrySelectionContext) {
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
  switch (resolveStoreSyncType(ctx.store)) {
    case StoreSyncType.WEB_ONLY:
      return syncWebOnlyStore(ctx);
    case StoreSyncType.USED_ONLY:
      return syncUsedOnlyStore(ctx);
    default:
      return syncNormalStore(ctx);
  }
}
