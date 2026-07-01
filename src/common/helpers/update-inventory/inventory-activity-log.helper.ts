import { Injectable } from '@nestjs/common';
import { Transaction } from 'sequelize';
import { VARIANT_STATUS } from 'src/common/constants/inventory-update-fields';
import { ProductRepository } from 'src/db/repository/product.repository';
import { StoreRepository } from 'src/db/repository/store.repository';
import { UserRepository } from 'src/db/repository/user.repository';
import {
  getInventoryAuditChanges,
  normalizeAuditPurchaseDate,
  STATUS_LABELS,
} from './inventory-audit-diff';

const AUDIT_MESSAGES: Record<string, string> = {
  UPDATE: ' updated item • ',
  CREATE: ' created item • ',
  WITHDRAW_REQUEST: ' requested withdrawal • ',
  MARK_ACTIVE: ' reactivated the item • ',
  PRICE_CHANGE: ' requested price change • ',
  TRANSFER: ' added to transfer • ',
};

@Injectable()
export class InventoryActivityLogHelper {
  constructor(
    private readonly productRepo: ProductRepository,
    private readonly storeRepo: StoreRepository,
    private readonly userRepo: UserRepository,
  ) {}

  private async resolveStoreLocationLabel(storeLocationMappingId: number | null, transaction?: Transaction) {
    if (storeLocationMappingId == null) return null;
    const row = await this.storeRepo.storeLocationMappingModel.findByPk(storeLocationMappingId, {
      transaction,
    });
    return row?.name ?? null;
  }

  private resolveChannelLabelFromRow(row: any) {
    if (!row) return null;
    const plain = row.get ? row.get({ plain: true }) : row;
    const isShopify =
      plain.isShopifyChannel === true ||
      plain.is_shopify_channel === 1 ||
      plain.is_shopify_channel === true;

    if (isShopify) {
      return plain.displayName ?? plain.channelName ?? null;
    }

    return plain.channelName ?? plain.displayName ?? null;
  }

  private async resolveChannelLabel(channelId: number | null, transaction?: Transaction) {
    if (channelId == null) return null;
    const row = await this.productRepo.channelModel.findByPk(channelId, { transaction });
    return this.resolveChannelLabelFromRow(row);
  }

  private async resolveOwnerLabel(userId: number | null, transaction?: Transaction) {
    if (userId == null) return null;
    const row = await this.userRepo.userModel.findByPk(userId, { transaction });
    if (!row) return String(userId);
    return `${row.firstName || ''} ${row.lastName || ''}`.trim() || row.email || String(userId);
  }

  private normalizeCustomFieldsForAudit(customFields: any[] = []) {
    return (customFields || [])
      .filter((field) => field?.fieldName || field?.definition?.fieldName)
      .map((field) => ({
        fieldName: field.fieldName || field.definition?.fieldName,
        fieldValue: field.fieldValue ?? field.value ?? null,
        definition: {
          fieldName: field.fieldName || field.definition?.fieldName,
        },
      }));
  }

  async fetchVariantCustomFields(variantId: number, storeId: number, transaction?: Transaction) {
    if (!variantId || !storeId) return [];

    const rows = await this.productRepo.customFieldValueModel.findAll({
      where: { variant_id: variantId, store_id: storeId },
      transaction,
    });

    return rows.map((row) => ({
      fieldName: row.field_name,
      fieldValue: row.field_value,
      definition: { fieldName: row.field_name },
    }));
  }

  buildInventoryAuditSnapshot(inventory: any, variant: any, extras: Record<string, unknown> = {}) {
    return {
      itemId: inventory?.id ?? inventory?.itemId,
      skuNumber: inventory?.skuNumber ?? inventory?.sku_number,
      itemName: inventory?.itemName ?? inventory?.item_name,
      displayName: inventory?.displayName ?? inventory?.display_name,
      publishedScope: inventory?.publishedScope ?? inventory?.published_scope,
      auctionEnabled: inventory?.auctionEnabled ?? inventory?.auction_enabled,
      linkedImage: inventory?.linkedImage ?? inventory?.linked_image,
      isVisible: inventory?.isVisible ?? inventory?.is_visible,
      soldOn: inventory?.soldOn ?? inventory?.sold_on,
      variant: [
        {
          status: variant?.status,
          price: variant?.price,
          cost: variant?.cost ?? variant?.purchase_price,
          payout: variant?.payout,
          fee: variant?.fee,
          location: variant?.location,
          note: variant?.note,
          weight: variant?.weight,
          compare_at_price: variant?.compare_at_price,
          itemTags: variant?.itemTags ?? variant?.item_tags,
          option1: variant?.option1,
          option1Value: variant?.option1Value,
          option2: variant?.option2,
          option2Value: variant?.option2Value,
          option3: variant?.option3,
          option3Value: variant?.option3Value,
          paymentForm: variant?.paymentForm ?? variant?.payment_form,
          purchaseDate: normalizeAuditPurchaseDate(variant?.purchaseDate ?? variant?.purchase_date),
          purchaseFromVendor: variant?.purchaseFromVendor ?? variant?.purchase_from_vendor,
          vendorOrderNo: variant?.vendorOrderNo ?? variant?.vendor_order_no,
          localOrderNo: variant?.localOrderNo ?? variant?.local_order_no,
          storeLocationMapping: extras.storeLocationName ? { name: extras.storeLocationName } : null,
          channelObj: extras.channelDisplayName ? { displayName: extras.channelDisplayName } : null,
          customFields: this.normalizeCustomFieldsForAudit(extras.customFields as any[]),
        },
      ],
    };
  }

  async buildInventoryActivityChanges({
    oldInv,
    oldVar,
    newInv,
    newVar,
    oldCustomFields,
    newCustomFields,
    variantIncoming,
    transaction,
  }: {
    oldInv: Record<string, unknown>;
    oldVar: Record<string, unknown>;
    newInv: Record<string, unknown>;
    newVar: Record<string, unknown>;
    oldCustomFields: unknown[];
    newCustomFields: unknown[];
    variantIncoming: Record<string, unknown>;
    transaction?: Transaction;
  }) {
    const [oldStoreLocationName, newStoreLocationName, oldChannelDisplayName, newChannelDisplayName] =
      await Promise.all([
        this.resolveStoreLocationLabel(
          (oldVar?.storeLocationMappingId ?? oldVar?.store_location_mapping_id) as number,
          transaction,
        ),
        this.resolveStoreLocationLabel(
          (newVar?.storeLocationMappingId ?? newVar?.store_location_mapping_id) as number,
          transaction,
        ),
        this.resolveChannelLabel((oldVar?.channelId ?? oldVar?.channel_id) as number, transaction),
        this.resolveChannelLabel((newVar?.channelId ?? newVar?.channel_id) as number, transaction),
      ]);

    const oldSnapshot = this.buildInventoryAuditSnapshot(oldInv, oldVar, {
      storeLocationName: oldStoreLocationName,
      channelDisplayName: oldChannelDisplayName,
      customFields: oldCustomFields,
    });
    const newSnapshot = this.buildInventoryAuditSnapshot(newInv, newVar, {
      storeLocationName: newStoreLocationName,
      channelDisplayName: newChannelDisplayName,
      customFields: newCustomFields,
    });

    const changes = getInventoryAuditChanges(oldSnapshot, newSnapshot);

    const oldPurchaseDate = normalizeAuditPurchaseDate(oldVar?.purchaseDate ?? oldVar?.purchase_date);
    let newPurchaseDate = normalizeAuditPurchaseDate(newVar?.purchaseDate ?? newVar?.purchase_date);

    if (variantIncoming?.purchaseDate !== undefined) {
      const intendedPurchaseDate =
        variantIncoming.purchaseDate == null || variantIncoming.purchaseDate === ''
          ? null
          : normalizeAuditPurchaseDate(variantIncoming.purchaseDate);

      if (String(oldPurchaseDate ?? '') !== String(intendedPurchaseDate ?? '')) {
        newPurchaseDate = intendedPurchaseDate;
      }
    }

    if (String(oldPurchaseDate ?? '') !== String(newPurchaseDate ?? '')) {
      const existingPurchaseDateKey = Object.keys(changes).find(
        (key) => key.toLowerCase().replace(/\s+/g, '') === 'purchasedate',
      );
      if (!existingPurchaseDateKey) {
        changes['Purchase Date'] = { old: oldPurchaseDate, new: newPurchaseDate };
      }
    }

    if (String(oldChannelDisplayName ?? '') !== String(newChannelDisplayName ?? '')) {
      const existingChannelKey = Object.keys(changes).find(
        (key) => key.toLowerCase().replace(/\s+/g, '') === 'saleschannel',
      );
      if (!existingChannelKey) {
        changes.SalesChannel = {
          old: oldChannelDisplayName ?? null,
          new: newChannelDisplayName ?? null,
        };
      }
    }

    const oldOwnerId = oldInv?.user_id ?? oldInv?.userId;
    const newOwnerId = newInv?.user_id ?? newInv?.userId;
    if (oldOwnerId != null && newOwnerId != null && Number(oldOwnerId) !== Number(newOwnerId)) {
      changes.Owner = {
        old: await this.resolveOwnerLabel(Number(oldOwnerId), transaction),
        new: await this.resolveOwnerLabel(Number(newOwnerId), transaction),
      };
    }

    return changes;
  }

  private async writeActivityLog({
    entityId,
    userId,
    action,
    message,
    changes = null,
    timestamp = new Date(),
    transferId = null,
    transaction,
  }: {
    entityId: number;
    userId: number;
    action: string;
    message: string;
    changes?: Record<string, unknown> | null;
    timestamp?: Date;
    transferId?: number | null;
    transaction?: Transaction;
  }) {
    if (!entityId || userId == null) return false;

    await this.productRepo.activityLogModel.create(
      {
        entityType: 'Inventory',
        entityId,
        userId,
        action,
        message,
        changes,
        transferId,
        timestamp,
      },
      transaction ? { transaction } : undefined,
    );

    return true;
  }

  async recordInventoryUpdate(params: {
    entityId: number;
    userId: number;
    oldInv: Record<string, unknown>;
    oldVar: Record<string, unknown>;
    newInv: Record<string, unknown>;
    newVar: Record<string, unknown>;
    oldCustomFields: unknown[];
    newCustomFields: unknown[];
    variantIncoming: Record<string, unknown>;
    flow?: string;
    transferId?: number | null;
    transaction?: Transaction;
  }) {
    const {
      entityId,
      userId,
      oldInv,
      oldVar,
      newInv,
      newVar,
      oldCustomFields,
      newCustomFields,
      variantIncoming,
      flow = 'UPDATE',
      transferId = null,
      transaction,
    } = params;

    const changes = await this.buildInventoryActivityChanges({
      oldInv,
      oldVar,
      newInv,
      newVar,
      oldCustomFields,
      newCustomFields,
      variantIncoming,
      transaction,
    });

    if (userId == null || !changes || !Object.keys(changes).length) return;

    const isWithdrawRequested =
      (changes as any).Status?.new === STATUS_LABELS[VARIANT_STATUS.WITHDRAWAL_REQUESTED];

    if (isWithdrawRequested) {
      await this.writeActivityLog({
        entityId,
        userId,
        action: 'WITHDRAW_REQUEST',
        message: AUDIT_MESSAGES.WITHDRAW_REQUEST,
        changes: { Status: (changes as any).Status },
        transaction,
      });
      delete (changes as any).Status;
    }

    const nonUpdateFlows = new Set([
      'PRICE_CHANGE',
      'PRICE_CHANGE_APPROVED',
      'PRICE_CHANGE_REJECTED',
      'WITHDRAW_APPROVED',
      'WITHDRAW_REJECTED',
      'MARK_ACTIVE',
      'TRANSFER',
      'PAYOUT',
    ]);

    if (flow && nonUpdateFlows.has(String(flow).toUpperCase()) && !isWithdrawRequested) {
      await this.writeActivityLog({
        entityId,
        userId,
        action: flow.toUpperCase(),
        message: AUDIT_MESSAGES[flow.toUpperCase()] || AUDIT_MESSAGES.UPDATE,
        changes: changes as Record<string, unknown>,
        transferId: ['TRANSFER', 'PAYOUT'].includes(String(flow).toUpperCase()) ? transferId : null,
        transaction,
      });
      return;
    }

    if (!Object.keys(changes).length) return;

    await this.writeActivityLog({
      entityId,
      userId,
      action: 'UPDATE',
      message: AUDIT_MESSAGES.UPDATE,
      changes: changes as Record<string, unknown>,
      transaction,
    });
  }

  async recordInventoryCreateLog({
    entityId,
    userId,
    createdOn,
    transaction,
  }: {
    entityId: number;
    userId: number;
    createdOn?: Date | string;
    transaction?: Transaction;
  }) {
    if (!entityId || userId == null) return;

    await this.writeActivityLog({
      entityId,
      userId,
      action: 'CREATE',
      message: AUDIT_MESSAGES.CREATE,
      changes: null,
      timestamp: createdOn ? new Date(createdOn) : new Date(),
      transaction,
    });
  }

  async recordInventoryCreateBatch(inventories: any[] = [], userId: number, transaction?: Transaction) {
    if (userId == null || !Array.isArray(inventories) || !inventories.length) return;

    for (const inventory of inventories) {
      const entityId = inventory?.id ?? inventory?.itemId;
      if (!entityId) continue;

      await this.recordInventoryCreateLog({
        entityId,
        userId,
        createdOn: inventory?.created_on ?? inventory?.createdOn,
        transaction,
      });
    }
  }
}
