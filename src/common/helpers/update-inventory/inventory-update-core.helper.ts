import { InjectConnection } from '@nestjs/sequelize';
import { Injectable } from '@nestjs/common';
import { Op, Transaction } from 'sequelize';
import { Sequelize } from 'sequelize-typescript';
import {
  INVENTORY_FIELDS,
  SHOPIFY_ACTION,
  SHOPIFY_PATCH_FIELDS,
  VARIANT_FIELDS,
  VARIANT_STATUS,
} from 'src/common/constants/inventory-update-fields';
import { StoreTagSource } from 'src/db/entities';
import { ProductRepository } from 'src/db/repository/product.repository';
import { StoreRepository } from 'src/db/repository/store.repository';
import { UserRepository } from 'src/db/repository/user.repository';
import { ShopifyServiceFactory } from 'src/modules/shopify/shopify.service';
import { HandleMetaFieldsHelper } from '../shared/handle-meta-fields.helper';
import { CustomFieldValueAuditHelper } from '../shared/custom-field-value-audit.helper';
import { UniqueProductStoreShopifyHelper } from '../shopify/unique-product-store-shopify.helper';
import { ShopifyInventorySyncHelper } from '../shopify/shopify-inventory-sync.helper';
import { ShopifySyncQueueService } from 'src/queues/shopify-sync-queue.service';
import { isSamePurchaseDateValue, isSameSoldOnValue } from './inventory-audit-diff';
import { InventoryActivityLogHelper } from './inventory-activity-log.helper';
import {
  collectIncomingPatchFields,
  diffChangedFields,
  diffSavedChanges,
  formatUpdateError,
  isStatusSentinel,
  normalizeVariantNotNullDefaults,
  readRowField,
  resolveShopifyAction,
  resolveVariantIncoming,
  snapshotRow,
  toKey,
} from './inventory-update-helpers';
import { InventoryUpdateParityHelper } from './inventory-update-parity.helper';
import { MarkInventorySold } from '../sold-inventory.helper';

const VARIANT_ATTR: Record<string, string> = {
  paymentForm: 'payment_form',
  purchaseDate: 'purchase_date',
  vendorOrderNo: 'vendorOrderNo',
  purchaseFromVendor: 'purchase_from_vendor',
  localOrderNo: 'localOrderNo',
  itemTags: 'itemTags',
  variantImage: 'variantImage',
  storeLocationMappingId: 'storeLocationMappingId',
  channelId: 'channelId',
  soldSource: 'soldSource',
};

const parsePurchaseDateValue = (val: unknown) => {
  if (val == null) return val;
  if (val instanceof Date) return Number.isNaN(val.getTime()) ? null : val;
  const s = String(val).trim();
  if (!s) return null;
  if (s.includes('T')) {
    const parsed = new Date(s);
    return Number.isNaN(parsed.getTime()) ? null : parsed;
  }
  const dateOnly = s.match(/^(\d{4}-\d{2}-\d{2})/);
  if (dateOnly) {
    const [y, m, d] = dateOnly[1].split('-').map(Number);
    return new Date(Date.UTC(y, m - 1, d, 0, 0, 0, 0));
  }
  const parsed = new Date(s);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
};

@Injectable()
export class InventoryUpdateCoreHelper {
  constructor(
    private readonly productRepo: ProductRepository,
    private readonly storeRepo: StoreRepository,
    private readonly userRepo: UserRepository,
    private readonly shopifyFactory: ShopifyServiceFactory,
    private readonly uniqueProduct: UniqueProductStoreShopifyHelper,
    private readonly metaFields: HandleMetaFieldsHelper,
    private readonly customFieldAudit: CustomFieldValueAuditHelper,
    private readonly updateParity: InventoryUpdateParityHelper,
    private readonly activityLog: InventoryActivityLogHelper,
    private readonly shopifySync: ShopifyInventorySyncHelper,
    private readonly shopifyQueue: ShopifySyncQueueService,
    private readonly markSold: MarkInventorySold,
    @InjectConnection() private readonly sequelize: Sequelize,
  ) {}

  private isStoreAccountUser(user: any) {
    if (!user) return true;
    const fullName = `${user.firstName || ''} ${user.lastName || ''}`.trim().toLowerCase();
    return fullName === 'store account';
  }

  private toLinkedImageBoolean(val: unknown) {
    return val === 1 || val === true || val === '1';
  }

  private syncLinkedImageFlags(inventory: any, variant: any, linkedImage: boolean) {
    inventory.set('linkedImage', linkedImage);
    variant.set('linkedImage', linkedImage);
  }

  private async resolveChannelId({
    variantIncoming,
    storeId,
    transaction,
  }: {
    variantIncoming: Record<string, unknown>;
    storeId: number;
    transaction: Transaction;
  }) {
    const hasExplicitLabel =
      variantIncoming.salesChannelList !== undefined ||
      variantIncoming.channelDisplayName !== undefined;

    if (!hasExplicitLabel) {
      if (variantIncoming.channelId != null) return Number(variantIncoming.channelId);
      const channelObjId = (variantIncoming.channelObj as any)?.id;
      if (channelObjId != null && /^\d+$/.test(String(channelObjId))) {
        return Number(channelObjId);
      }
    }

    const label =
      variantIncoming.channelDisplayName ??
      variantIncoming.salesChannelList ??
      (variantIncoming.channelObj as any)?.displayName ??
      (variantIncoming.channelObj as any)?.channelName;

    if (!label) return null;

    const trimmed = String(label).trim();
    if (!trimmed) return null;
    const lowerLabel = trimmed.toLowerCase();
    const lowerMatch = (column: string) =>
      this.sequelize.where(this.sequelize.fn('LOWER', this.sequelize.col(column)), lowerLabel);

    let row = await this.productRepo.channelModel.findOne({
      where: { storeId, [Op.and]: [lowerMatch('display_name')] },
      transaction,
    });

    if (!row) {
      row = await this.productRepo.channelModel.findOne({
        where: {
          storeId,
          isShopifyChannel: { [Op.or]: [false, 0] },
          [Op.and]: [lowerMatch('channel_name')],
        },
        transaction,
      });
    }

    if (!row) {
      row = await this.productRepo.channelModel.findOne({
        where: { storeId, [Op.and]: [lowerMatch('channel_name')] },
        transaction,
      });
    }

    return row?.id ?? null;
  }

  private normalizeIncomingChannelLabel(variantIncoming: Record<string, unknown>) {
    if (variantIncoming?.salesChannelList !== undefined) {
      const value = variantIncoming.salesChannelList;
      return value == null || value === '' ? null : String(value).trim();
    }
    if (variantIncoming?.channelDisplayName !== undefined) {
      const value = variantIncoming.channelDisplayName;
      return value == null || value === '' ? null : String(value).trim();
    }
    if (variantIncoming?.channelObj != null) {
      const obj = variantIncoming.channelObj as Record<string, unknown>;
      const value = obj.displayName ?? obj.channelName;
      return value == null || value === '' ? null : String(value).trim();
    }
    return undefined;
  }

  private async applyInventoryUpdateRules({
    inventory,
    variant,
    allVariants,
    incoming,
    variantIncoming,
    oldVariantStatus,
    storeId,
    transaction,
  }: {
    inventory: any;
    variant: any;
    allVariants: any[];
    incoming: Record<string, unknown>;
    variantIncoming: Record<string, unknown>;
    oldVariantStatus: number;
    storeId: number;
    transaction: Transaction;
  }) {
    const now = new Date();
    const oldStatus = Number(oldVariantStatus);
    const hasStatusPatch =
      variantIncoming.status !== undefined && !isStatusSentinel(variantIncoming.status);
    const newStatus = hasStatusPatch ? Number(variantIncoming.status) : oldStatus;

    if (hasStatusPatch) {
      if (oldStatus === VARIANT_STATUS.INACTIVE && newStatus === VARIANT_STATUS.ACTIVE) {
        if (!inventory.acceptedOn && !variant.accepted_on) {
          inventory.set('acceptedOn', now);
          variant.set('accepted_on', now);
        }
      } else if (oldStatus === VARIANT_STATUS.NEEDS_APPROVAL && newStatus === VARIANT_STATUS.ACTIVE) {
        inventory.set('acceptedOn', now);
        variant.set('accepted_on', now);
      } else if (oldStatus === VARIANT_STATUS.ACTIVE && newStatus === VARIANT_STATUS.SOLD) {
        if (incoming.soldOn === undefined) inventory.set('soldOn', now);
      } else if (oldStatus === VARIANT_STATUS.ACTIVE && newStatus === VARIANT_STATUS.NEEDS_APPROVAL) {
        inventory.set('acceptedOn', null);
        variant.set('accepted_on', null);
      } else if (oldStatus === VARIANT_STATUS.ACTIVE && newStatus === VARIANT_STATUS.WITHDRAWN) {
        variant.set('accepted_on', null);
        variant.set('status', VARIANT_STATUS.WITHDRAWN);
      } else if (oldStatus === VARIANT_STATUS.DELETED && newStatus === VARIANT_STATUS.INACTIVE) {
        inventory.set('isVisible', true);
      }

      if (newStatus === VARIANT_STATUS.PAID) {
        variant.set('payoutManual', '1');
      }
    }

    if (hasStatusPatch && newStatus === VARIANT_STATUS.SOLD) {
      variant.set('quantity', 0);
      const orderId = variantIncoming.orderId ?? variant.order_id;
      if (orderId == null || String(orderId).trim() === '') {
        variant.set('soldSource', '2');
        variant.set('source_name', 'OneSync Local');
      }
    }

    if (incoming.consignerUserId !== undefined) {
      const ownerId =
        incoming.consignerUserId && typeof incoming.consignerUserId === 'object'
          ? ((incoming.consignerUserId as any).id ?? (incoming.consignerUserId as any).userId)
          : incoming.consignerUserId;

      if (ownerId != null) {
        const owner = await this.userRepo.userModel.findByPk(Number(ownerId), { transaction });
        if (owner) {
          const currentOwnerId = inventory.user_id;
          if (Number(owner.id) !== Number(currentOwnerId)) {
            inventory.set('user_id', owner.id);
            variant.set('user_id', owner.id);

            const storeAccount = this.isStoreAccountUser(owner);
            const accountType = storeAccount ? 1 : 0;
            inventory.set('accountType', accountType);
            variant.set('accountType', accountType);

            if (storeAccount) {
              variant.set('fee', 0);
              variant.set('payout', 0);
            } else {
              if (variantIncoming.fee != null) variant.set('fee', variantIncoming.fee);
              if (variantIncoming.payout != null) variant.set('payout', variantIncoming.payout);
            }
          }
        }
      }
    }

    const incomingChannelLabel = this.normalizeIncomingChannelLabel(variantIncoming);
    const hasChannelPatch =
      incomingChannelLabel !== undefined ||
      variantIncoming.channelId !== undefined ||
      variantIncoming.channelObj != null;

    if (hasChannelPatch) {
      if (incomingChannelLabel === null) {
        variant.set('channelId', null);
      } else if (incomingChannelLabel !== undefined) {
        const resolvedChannelId = await this.resolveChannelId({ variantIncoming, storeId, transaction });
        if (resolvedChannelId != null) {
          variant.set('channelId', resolvedChannelId);
        } else {
          throw new Error(`Sales channel "${incomingChannelLabel}" was not found for store ${storeId}`);
        }
      } else if (variantIncoming.channelId != null) {
        variant.set('channelId', Number(variantIncoming.channelId));
      }
    }

    if (incoming.isVisible === false || incoming.isVisible === 0) {
      inventory.set('isVisible', false);
      inventory.set('deletedAt', now);
      for (const v of allVariants) {
        v.set('status', VARIANT_STATUS.DELETED);
      }
    }
  }

  private async ensureWithdrawalRequest({
    inventory,
    variant,
    storeId,
    transaction,
  }: {
    inventory: any;
    variant: any;
    storeId: number;
    transaction: Transaction;
  }) {
    if (Number(variant.status) !== VARIANT_STATUS.WITHDRAWAL_REQUESTED) return;

    const existing = await this.productRepo.WithdrawnRequestModel.findOne({
      where: { item_id: inventory.id, status: 'Requested' },
      transaction,
    });

    if (existing) {
      existing.set('requested_on', new Date());
      await existing.save({ transaction });
      return;
    }

    const user = inventory.user;
    const productList = inventory.productList;
    const ownerName = user ? `${user.firstName || ''} ${user.lastName || ''}`.trim() : '';

    await this.productRepo.WithdrawnRequestModel.create(
      {
        store_id: storeId,
        item_id: inventory.id,
        inventory_id: inventory.id,
        product_id: inventory.productId,
        variant_id: variant.id,
        product_name: inventory.itemName,
        sku: inventory.skuNumber,
        barcode: variant.barcode || variant.migrationId,
        size: variant.option1Value,
        item_condition: variant.option2Value,
        box_condition: variant.option3Value,
        product_type: productList?.type || inventory.type,
        price: variant.price,
        status: 'Requested',
        requested_on: new Date(),
        accepted_on: inventory.acceptedOn,
        owner: ownerName,
      } as any,
      { transaction },
    );
  }

  private groupShopifyJobs(shopifyJobs: any[]) {
    const deleteByProduct = new Map<number, any[]>();
    const resyncByProduct = new Map<number, Set<number>>();

    for (const job of shopifyJobs) {
      if (job.action === SHOPIFY_ACTION.DELETE) {
        if (!deleteByProduct.has(job.productId)) deleteByProduct.set(job.productId, []);
        deleteByProduct.get(job.productId)!.push(job);
        resyncByProduct.delete(job.productId);
      } else if (job.action === SHOPIFY_ACTION.RESYNC && !deleteByProduct.has(job.productId)) {
        if (!resyncByProduct.has(job.productId)) resyncByProduct.set(job.productId, new Set());
        resyncByProduct.get(job.productId)!.add(job.inventory.id);
      }
    }

    return { deleteByProduct, resyncByProduct };
  }

  private async executeProductDeletes(shopifyService: any, store: any, productId: number, jobs: any[]) {
    if (!jobs?.length) return;

    if (this.uniqueProduct.isUniqueStore(store)) {
      for (const job of jobs) {
        await this.uniqueProduct.deleteUniqueListings(shopifyService, job.inventory, productId);
      }
      return;
    }

    const deleteTargets = jobs.filter((job) => job.inventory?.shopifyId);
    if (!deleteTargets.length) return;

    const shopifyIds = deleteTargets.map((job) => job.inventory.shopifyId);
    const results = await shopifyService.deleteItems(shopifyIds, productId);

    for (let i = 0; i < results.length; i++) {
      const result = results[i];
      const inventory = deleteTargets[i]?.inventory;
      if (!inventory) continue;
      if (result?.success || result?.message === 'Not found') {
        await this.productRepo.inventoryModel.update(
          { shopifyId: null, shopifyStatus: 'Unlisted' },
          { where: { id: inventory.id } },
        );
      }
    }
  }

  private async reconcileLinkedWebEntries(store: any, productIds: number[]) {
    if (!productIds.length) return;
    await this.markSold.syncWebInventories({ productIds: [...new Set(productIds)], store });
  }

  private async processShopifySideEffects(shopifyJobs: any[], store: any, storeId: number) {
    const { deleteByProduct, resyncByProduct } = this.groupShopifyJobs(shopifyJobs);
    const shopifyService = this.shopifyFactory.createService(store, { useGraphql: true });
    const affectedProductIds = new Set<number>();

    for (const productId of deleteByProduct.keys()) affectedProductIds.add(productId);
    for (const productId of resyncByProduct.keys()) affectedProductIds.add(productId);

    if (deleteByProduct.size) {
      for (const [productId, jobs] of deleteByProduct.entries()) {
        await this.executeProductDeletes(shopifyService, store, productId, jobs);
      }
    }

    for (const [productId, inventoryIds] of resyncByProduct.entries()) {
      const expandedIds = await this.uniqueProduct.expandSyncIds(inventoryIds, store);
      await this.shopifySync.shopifyInventorySync(productId, storeId, {
        bulkSync: true,
        useGraphql: true,
        forceResync: true,
        inventoryIds: [...expandedIds],
        fromQueue: true,
        skipLinkedWebReconcile: true,
      });
    }

    await this.reconcileLinkedWebEntries(store, [...affectedProductIds]);
  }

  /** Fire-and-forget Shopify jobs (single-item / non-bulk updates). */
  private runShopifyJobs(shopifyJobs: any[], store: any, storeId: number) {
    if (!shopifyJobs.length) return;

    this.processShopifySideEffects(shopifyJobs, store, storeId).catch((err) =>
      console.error('❌ Shopify side-effects failed:', err.message),
    );
  }

  /**
   * Await all Shopify side-effects before completing a bulk job.
   * DB updates should use deferShopify; call this once every item is saved.
   */
  async flushShopifyJobs(shopifyJobs: any[], storeId: number, storeInput?: any) {
    if (!shopifyJobs.length) return;

    const store =
      storeInput ??
      (await this.storeRepo.storeModel.findByPk(storeId, {
        include: [{ model: StoreTagSource, as: 'tags', through: { attributes: [] } }],
      }));
    if (!store) return;

    await this.processShopifySideEffects(shopifyJobs, store, storeId);
  }

  async runInventoryUpdates(
    items: { itemId: number; [key: string]: unknown }[],
    {
      storeId,
      roleId,
      userId,
      deltaMode = false,
      deferShopify = false,
    }: {
      storeId: number;
      roleId: number;
      userId: number;
      deltaMode?: boolean;
      deferShopify?: boolean;
    },
  ) {
    const transaction = await this.sequelize.transaction();
    const results: any[] = [];
    const errors: { itemId: number; message: string }[] = [];
    const shopifyJobs: any[] = [];
    const tagSyncProductIds: number[] = [];
    const pendingActivityLogs: any[] = [];

    try {
      const store = await this.storeRepo.storeModel.findByPk(storeId, {
        include: [{ model: StoreTagSource, as: 'tags', through: { attributes: [] } }],
        transaction,
      });
      if (!store) throw new Error('Store not found');

      for (const item of items) {
        try {
          const { itemId, ...incoming } = item;
          const variantIncoming = resolveVariantIncoming(incoming);

          const inventory = (await this.productRepo.inventoryModel.findOne({
            where: { id: itemId, storeId },
            include: [
              { model: this.productRepo.variantModel, as: 'variants' },
              { model: this.userRepo.userModel, as: 'user' },
              { model: this.productRepo.productListModel, as: 'productList' },
            ],
            transaction,
            lock: transaction.LOCK.UPDATE,
          })) as any;
          if (!inventory) throw new Error(`Inventory with ID ${itemId} not found`);

          let variant: any;
          if (variantIncoming.id != null) {
            variant = inventory.variants.find((v) => Number(v.id) === Number(variantIncoming.id));
            if (!variant) throw new Error(`Variant ${variantIncoming.id} not found on item ${itemId}`);
          } else if (inventory.variants.length === 1) {
            variant = inventory.variants[0];
          } else {
            throw new Error(`variant.id is required — item ${itemId} has ${inventory.variants.length} variants`);
          }

          const oldVariantStatus = variant.status;
          const status = Number(oldVariantStatus);
          if ((status === VARIANT_STATUS.SOLD || status === VARIANT_STATUS.PAID) && roleId !== 0 && roleId !== 1) {
            const soldOnChanging =
              incoming.soldOn !== undefined &&
              String(incoming.soldOn ?? '') !== String(inventory.soldOn ?? '');
            if (!soldOnChanging) {
              throw new Error(`Not allowed to update Sold/Paid inventory: ID ${itemId}`);
            }
          }

          const oldInv = snapshotRow(inventory.get({ plain: true }));
          const oldVar = snapshotRow(variant.get({ plain: true }));
          const oldCustomFields = await this.activityLog.fetchVariantCustomFields(variant.id, storeId, transaction);

          for (const [rawKey, rawVal] of Object.entries(incoming)) {
            if (rawVal === undefined || rawKey === 'variant') continue;
            const key = toKey(rawKey);
            if (!INVENTORY_FIELDS.has(key)) continue;

            let val = rawVal;
            if (key === 'consignerUserId' && val && typeof val === 'object') val = (val as any).id ?? (val as any).userId;
            if (key === 'linkedImage') val = this.toLinkedImageBoolean(val);
            if (key === 'isVisible') val = val !== 0 && val !== false;
            if (key === 'auctionEnabled') val = val === 1 || val === true;

            const col = key === 'consignerUserId' ? 'user_id' : key;
            inventory.set(col, val);
            if (key === 'linkedImage') variant.set('linkedImage', val);
          }

          this.updateParity.applySoldOnSideEffects({ variant, incoming, variantIncoming });

          let customFields: unknown[] | undefined;
          for (const [rawKey, rawVal] of Object.entries(variantIncoming)) {
            if (rawVal === undefined || rawKey === 'id') continue;
            if (rawKey === 'channelObj' || rawKey === 'salesChannelList') continue;
            const key = toKey(rawKey);
            if (key === 'channelDisplayName') continue;
            if (!VARIANT_FIELDS.has(key)) continue;
            if (key === 'status' && isStatusSentinel(rawVal)) continue;
            if (key === 'customFields') {
              customFields = rawVal as unknown[];
              continue;
            }

            let val = rawVal;
            if (key === 'linkedImage') {
              val = this.toLinkedImageBoolean(rawVal);
              this.syncLinkedImageFlags(inventory, variant, val as boolean);
              continue;
            }
            if (key === 'itemTags') val = this.updateParity.normalizeItemTagsValue(rawVal);
            if (key === 'purchaseDate') val = parsePurchaseDateValue(rawVal) as any;
            if (key === 'payout' && val == null) val = 0;
            if (key === 'weight' && val === '') val = null;
            if (key === 'compare_at_price' && val != null) val = String(val);

            variant.set(VARIANT_ATTR[key] || key, val);
          }

          if (
            variantIncoming.variantImage !== undefined &&
            variantIncoming.variantImage !== null &&
            String(variantIncoming.variantImage).trim() !== ''
          ) {
            this.syncLinkedImageFlags(inventory, variant, true);
          }

          if (variantIncoming.variantImage !== undefined) {
            await this.uniqueProduct.syncImagesFromVariant({ inventory, variant, store, transaction });
          }

          await this.applyInventoryUpdateRules({
            inventory,
            variant,
            allVariants: inventory.variants,
            incoming,
            variantIncoming,
            oldVariantStatus,
            storeId,
            transaction,
          });

          const tagProductId = await this.updateParity.applyLocationPrintAndPaymentRules({
            inventory,
            variant,
            variantIncoming,
            oldVariantStatus,
            oldLocation: oldVar.location,
            storeId,
            transaction,
          });
          if (tagProductId) tagSyncProductIds.push(tagProductId);

          await inventory.save({ transaction });
          for (const v of inventory.variants) {
            if (Number(v.id) === Number(variant.id) || v.changed()) {
              normalizeVariantNotNullDefaults(v);
              await v.save({ transaction });
            }
          }

          if (customFields?.length) {
            const rev = await this.customFieldAudit.createCustomFieldRevision(transaction, String(userId || 'SYSTEM'));
            await this.metaFields.handleCustomMetaFields({
              customFields: customFields as any[],
              storeId,
              variantId: variant.id,
              transaction,
              rev,
              username: String(userId || 'SYSTEM'),
            });
          }

          await this.ensureWithdrawalRequest({ inventory, variant, storeId, transaction });

          const newStatus = Number(variant.status);
          if (
            variantIncoming.status !== undefined &&
            !isStatusSentinel(variantIncoming.status) &&
            Number(oldVariantStatus) !== newStatus
          ) {
            await this.updateParity.syncAuditItemsOnStatusChange({
              inventoryId: inventory.id,
              oldStatus: oldVariantStatus,
              newStatus,
              transaction,
            });
          }
          if (Number(oldVariantStatus) === VARIANT_STATUS.ACTIVE && newStatus !== VARIANT_STATUS.ACTIVE) {
            await this.updateParity.deleteDraftTransferItems(inventory.id, transaction);
          }

          const newInv = inventory.get({ plain: true });
          const newVar = variant.get({ plain: true });
          const changedFields = new Set([
            ...diffChangedFields(oldInv, incoming),
            ...diffChangedFields(oldVar, variantIncoming),
            ...diffSavedChanges(oldInv, newInv, INVENTORY_FIELDS),
            ...diffSavedChanges(oldVar, newVar, VARIANT_FIELDS),
          ]);
          if (customFields?.length) changedFields.add('customFields');

          if (variantIncoming.purchaseDate !== undefined) {
            const prevPurchase = readRowField(oldVar, 'purchaseDate');
            const nextPurchase = readRowField(newVar, 'purchaseDate');
            if (!isSamePurchaseDateValue(prevPurchase, nextPurchase)) changedFields.add('purchaseDate');
          }

          if (incoming.soldOn !== undefined) {
            const prevSoldOn = readRowField(oldInv, 'soldOn');
            const nextSoldOn = readRowField(newInv, 'soldOn');
            if (!isSameSoldOnValue(prevSoldOn, nextSoldOn)) changedFields.add('soldOn');
          }

          const publishedScope = String(newInv.publishedScope || oldInv.publishedScope || '');
          const isGlobalScope = publishedScope === 'global';

          if (userId != null && changedFields.size > 0 && isGlobalScope) {
            let newCustomFields = oldCustomFields;
            if (customFields?.length) newCustomFields = customFields as any[];
            else if (changedFields.has('customFields')) {
              newCustomFields = await this.activityLog.fetchVariantCustomFields(variant.id, storeId, transaction);
            }

            pendingActivityLogs.push({
              entityId: inventory.id,
              userId,
              oldInv,
              oldVar,
              newInv,
              newVar,
              oldCustomFields,
              newCustomFields,
              variantIncoming,
              inventoryIncoming: incoming,
            });
          }

          if (deltaMode) {
            for (const key of collectIncomingPatchFields(incoming, variantIncoming, SHOPIFY_PATCH_FIELDS)) {
              changedFields.add(key);
            }
          }

          const shopifyAction = resolveShopifyAction({
            changedFields,
            newState: { inventory: newInv, variant: newVar },
            oldVariantStatus,
            store: store.get({ plain: true }),
            roleId,
          });

          results.push({
            itemId,
            variantId: variant.id,
            productId: inventory.productId,
            changedFields: [...changedFields],
            shopifyAction,
            inventory: newInv,
          });

          if (shopifyAction !== SHOPIFY_ACTION.NONE && inventory.productId) {
            shopifyJobs.push({
              action: shopifyAction,
              productId: inventory.productId,
              inventory: newInv,
            });
          }
        } catch (err: any) {
          errors.push({ itemId: item.itemId, message: formatUpdateError(err) });
        }
      }

      if (!results.length) {
        await transaction.rollback();
        return { results, errors, failed: true };
      }

      await this.updateParity.mapStoreTagsToProducts(tagSyncProductIds, store, transaction);
      await transaction.commit();

      for (const pendingLog of pendingActivityLogs) {
        try {
          await this.activityLog.recordInventoryUpdate(pendingLog);
        } catch (activityError: any) {
          console.error('[activityLog] flush failed for item', activityError);
        }
      }

      if (deferShopify) {
        return {
          results,
          errors,
          failed: false,
          shopifyJobs,
          store: store.get({ plain: true }),
        };
      }

      this.runShopifyJobs(shopifyJobs, store, storeId);

      return { results, errors, failed: false };
    } catch (err) {
      await transaction.rollback();
      throw err;
    }
  }
}
