import { Injectable } from '@nestjs/common';
import { Op, Transaction } from 'sequelize';
import { VARIANT_STATUS } from 'src/common/constants/inventory-update-fields';
import { ProductRepository } from 'src/db/repository/product.repository';
import { StoreRepository } from 'src/db/repository/store.repository';
import { Inventory, Variant } from 'src/db/entities';
import { isStatusSentinel, same } from './inventory-update-helpers';

const VARIANT_TO_AUDIT_STATUS: Record<number, string> = {
  [VARIANT_STATUS.INACTIVE]: 'INACTIVE',
  [VARIANT_STATUS.ACTIVE]: 'ACTIVE',
  [VARIANT_STATUS.SOLD]: 'SOLD',
  [VARIANT_STATUS.PAID]: 'PAID',
  [VARIANT_STATUS.NEEDS_APPROVAL]: 'NEEDS_APPROVAL',
  [VARIANT_STATUS.WITHDRAWAL_REQUESTED]: 'WITHDRAWAL_REQUESTED',
  [VARIANT_STATUS.WITHDRAWN]: 'WITHDRAWAL',
};

@Injectable()
export class InventoryUpdateParityHelper {
  constructor(
    private readonly productRepo: ProductRepository,
    private readonly storeRepo: StoreRepository,
  ) {}

  mapVariantStatusToAuditStatus(status: number) {
    return VARIANT_TO_AUDIT_STATUS[Number(status)] || 'ACTIVE';
  }

  applySoldOnSideEffects({
    variant,
    incoming,
    variantIncoming,
  }: {
    variant: Variant;
    incoming: Record<string, unknown>;
    variantIncoming: Record<string, unknown>;
  }) {
    if (incoming.soldOn === undefined) return;

    if (variantIncoming.price != null) {
      variant.set('price', Number(variantIncoming.price));
    }

    const accountType = Number(variant.accountType ?? (variant as any).account_type ?? 0);
    if (accountType === 1) {
      variant.set('fee', 0);
      variant.set('payout', 0);
    } else {
      if (variantIncoming.fee != null) variant.set('fee', variantIncoming.fee);
      if (variantIncoming.payout != null) variant.set('payout', variantIncoming.payout);
    }
  }

  normalizeItemTagsValue(val: unknown) {
    if (val == null) return null;
    const trimmed = String(val).trim();
    return trimmed === '' ? null : trimmed;
  }

  async findBinLocationId(locationName: string, storeId: number, transaction?: Transaction) {
    if (!locationName) return null;
    const row = await this.storeRepo.locationModel.findOne({
      where: { name: locationName, storeId, parentId: { [Op.ne]: null } },
      attributes: ['id'],
      transaction,
    });
    return row?.id ?? null;
  }

  async ensurePaymentFormRegistered(paymentForm: string, storeId: number, transaction?: Transaction) {
    const value = paymentForm?.trim();
    if (!value) return;

    await this.productRepo.paymentFormModel.findOrCreate({
      where: { paymentForm: value, storeId },
      defaults: { paymentForm: value, storeId },
      transaction,
    });
  }

  async resolveTemplateId(inventory: Inventory, transaction?: Transaction) {
    const fromInventoryCategory = parseInt(String(inventory.category), 10);
    if (Number.isInteger(fromInventoryCategory)) return fromInventoryCategory;

    const productList = (inventory as any).productList;
    const fromProductCategory = parseInt(String(productList?.category), 10);
    if (Number.isInteger(fromProductCategory)) return fromProductCategory;

    const templateName = inventory.template?.trim();
    if (templateName && templateName.toLowerCase() !== 'unknown') {
      const row = await this.productRepo.templateModel.findOne({
        where: { name: templateName, storeId: inventory.storeId },
        attributes: ['id'],
        transaction,
      });
      if (row?.id) return row.id;
    }

    return null;
  }

  async loadTemplateLabels(inventory: Inventory, transaction?: Transaction) {
    const templateId = await this.resolveTemplateId(inventory, transaction);
    if (!Number.isInteger(templateId)) return [];

    const template = await this.productRepo.templateModel.findByPk(templateId!, { transaction });
    if (!template) return [];

    const labelIds = new Set<number>();
    if (template.item_label_id) labelIds.add(template.item_label_id);

    const links = await this.productRepo.templateItemLabelModel.findAll({
      where: { template_id: templateId },
      transaction,
    });
    links.forEach((l) => labelIds.add(l.label_id));

    if (!labelIds.size) return [];

    return this.productRepo.labelModel.findAll({
      where: { id: [...labelIds], store_id: inventory.storeId, deleted_at: null },
      transaction,
    });
  }

  isFieldEnabledInLabels(labels: { label_template?: unknown }[], fieldType: string) {
    if (!labels?.length || !fieldType?.trim()) return false;

    for (const label of labels) {
      let template = label.label_template;
      if (!template) continue;

      if (typeof template === 'string') {
        try {
          template = JSON.parse(template);
          if (typeof template === 'string') template = JSON.parse(template);
        } catch {
          continue;
        }
      }

      if (!Array.isArray(template)) continue;

      for (const node of template) {
        const nodeField = node?.fieldType ?? node?.field_type;
        if (nodeField && fieldType.trim().toLowerCase() === String(nodeField).trim().toLowerCase()) {
          return true;
        }
      }
    }

    return false;
  }

  async markItemPrintQueue(inventory: Inventory, transaction?: Transaction) {
    inventory.set('is_print_queue', false);
    inventory.set('printQueueLabelType', 'Item');

    const templateId = await this.resolveTemplateId(inventory, transaction);
    if (Number.isInteger(templateId)) {
      const template = await this.productRepo.templateModel.findByPk(templateId!, {
        attributes: ['id', 'name'],
        transaction,
      });
      if (template) {
        inventory.set('category', String(template.id));
        inventory.set('template', template.name || 'Unknown');
        return;
      }
    }

    const product = (inventory as any).productList;
    if (product?.category) {
      inventory.set('category', String(product.category));
      const productTemplateId = parseInt(String(product.category), 10);
      if (Number.isInteger(productTemplateId)) {
        const template = await this.productRepo.templateModel.findByPk(productTemplateId, {
          attributes: ['id', 'name'],
          transaction,
        });
        if (template?.name) {
          inventory.set('template', template.name);
          return;
        }
      }
    }
    if (product?.template) {
      inventory.set('template', product.template);
    }
  }

  async applyLocationPrintAndPaymentRules({
    inventory,
    variant,
    variantIncoming,
    oldVariantStatus,
    oldLocation,
    storeId,
    transaction,
  }: {
    inventory: Inventory;
    variant: Variant;
    variantIncoming: Record<string, unknown>;
    oldVariantStatus: number;
    oldLocation: string;
    storeId: number;
    transaction?: Transaction;
  }) {
    let tagSyncProductId: number | null = null;
    const newStatus =
      variantIncoming.status !== undefined && !isStatusSentinel(variantIncoming.status)
        ? Number(variantIncoming.status)
        : Number(variant.status);
    const oldStatus = Number(oldVariantStatus);
    const auctionEnabled = Boolean(inventory.auctionEnabled);

    if (variantIncoming.paymentForm !== undefined && variantIncoming.paymentForm !== null) {
      await this.ensurePaymentFormRegistered(String(variantIncoming.paymentForm), storeId, transaction);
    }

    const labels = await this.loadTemplateLabels(inventory, transaction);

    if (!auctionEnabled && variantIncoming.location !== undefined) {
      const nextLocation = variantIncoming.location;
      const locationChanged =
        nextLocation != null && !same(nextLocation, oldLocation ?? variant.location);

      if (locationChanged) {
        const locId = await this.findBinLocationId(String(nextLocation), storeId, transaction);
        if (locId != null) variant.set('location_id', locId);

        if (newStatus === VARIANT_STATUS.ACTIVE && this.isFieldEnabledInLabels(labels, 'Location')) {
          await this.markItemPrintQueue(inventory, transaction);
        }
      }
    } else if (
      auctionEnabled &&
      oldStatus === VARIANT_STATUS.NEEDS_APPROVAL &&
      newStatus === VARIANT_STATUS.ACTIVE
    ) {
      const targetLocation = Number(variant.accountType) === 0 ? 'Drop Ship' : 'Warehouse';
      variant.set('location', targetLocation);
      const locId = await this.findBinLocationId(targetLocation, storeId, transaction);
      if (locId != null) variant.set('location_id', locId);
      if (inventory.productId) tagSyncProductId = inventory.productId;
    }

    if (variantIncoming.status !== undefined && newStatus === VARIANT_STATUS.ACTIVE && oldStatus !== VARIANT_STATUS.ACTIVE) {
      await this.markItemPrintQueue(inventory, transaction);
    }

    if (variantIncoming.price !== undefined && newStatus === VARIANT_STATUS.ACTIVE) {
      if (this.isFieldEnabledInLabels(labels, 'price')) await this.markItemPrintQueue(inventory, transaction);
    }

    return tagSyncProductId;
  }

  async syncAuditItemsOnStatusChange({
    inventoryId,
    oldStatus,
    newStatus,
    transaction,
  }: {
    inventoryId: number;
    oldStatus: number;
    newStatus: number;
    transaction?: Transaction;
  }) {
    if (Number(oldStatus) === Number(newStatus)) return;

    const auditStatus = this.mapVariantStatusToAuditStatus(newStatus);
    const items = await this.productRepo.auditItemModel.findAll({
      where: { inventoryId },
      include: [{ model: this.productRepo.auditSessionModel, as: 'auditSession' }],
      transaction,
    });

    for (const item of items) {
      const session = (item as any).auditSession;
      if (session?.status?.toUpperCase() === 'COMPLETED') continue;
      if (item.scanned) continue;

      item.set('inventoryStatus', auditStatus);
      item.set('updatedAt', new Date());
      await item.save({ transaction });
    }
  }

  async deleteDraftTransferItems(inventoryId: number, transaction?: Transaction) {
    await this.productRepo.transferItemModel.destroy({
      where: { inventoryId, status: 'DRAFT' },
      transaction,
    });
  }

  async mapStoreTagsToProducts(updatedProductIds: number[], store: any, transaction?: Transaction) {
    if (!store?.tags?.length || !updatedProductIds?.length) return;

    const uniqueProductIds = [...new Set(updatedProductIds.filter(Boolean))];
    if (!uniqueProductIds.length) return;

    const tagNames = store.tags.map((t: { name: string }) => t.name).filter(Boolean);
    if (!tagNames.length) return;

    const existingTags = await this.productRepo.tagSourceModel.findAll({
      where: { input: { [Op.in]: tagNames } },
      transaction,
    });
    const tagByName = new Map(existingTags.map((t) => [t.input, t]));

    const syncedTags: any[] = [];
    for (const storeTag of store.tags) {
      let tag = tagByName.get(storeTag.name);
      if (tag) {
        let changed = false;
        if (tag.pos !== storeTag.pos) {
          tag.set('pos', storeTag.pos);
          changed = true;
        }
        if (tag.web !== storeTag.web) {
          tag.set('web', storeTag.web);
          changed = true;
        }
        if (changed) await tag.save({ transaction });
      } else {
        tag = await this.productRepo.tagSourceModel.create(
          { input: storeTag.name, web: storeTag.web, pos: storeTag.pos },
          { transaction },
        );
        tagByName.set(storeTag.name, tag);
      }
      syncedTags.push(tag);
    }

    const products = await this.productRepo.productListModel.findAll({
      where: { product_id: { [Op.in]: uniqueProductIds } },
      include: [{ model: this.productRepo.tagSourceModel, as: 'tags', through: { attributes: [] } }],
      transaction,
    });

    for (const product of products) {
      await (product as any).setTags(syncedTags, { transaction });
    }
  }
}
