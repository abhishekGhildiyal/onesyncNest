import { InjectConnection } from '@nestjs/sequelize';
import { Injectable, forwardRef, Inject } from '@nestjs/common';
import { QueryTypes, Transaction } from 'sequelize';
import { Sequelize } from 'sequelize-typescript';
import { ProductRepository } from 'src/db/repository/product.repository';
import { InventoryUpdateParityHelper } from '../update-inventory/inventory-update-parity.helper';

export const LABEL_STATUS = {
  NOT_PRINTED: 'NOT_PRINTED',
  PRINTED: 'PRINTED',
  UPDATED: 'UPDATED',
} as const;

@Injectable()
export class BulkInventoryAddParityHelper {
  constructor(
    private readonly productRepo: ProductRepository,
    @InjectConnection() private readonly sequelize: Sequelize,
    @Inject(forwardRef(() => InventoryUpdateParityHelper))
    private readonly inventoryUpdateParity: InventoryUpdateParityHelper,
  ) {}

  normalizeSku(sku: string) {
    return String(sku || '')
      .trim()
      .replace(/\s+/g, ' ');
  }

  isWebInventoryAccepted(roleId: number, variantList: { status?: number }[]) {
    return Number(roleId) === 1 && variantList.some((v) => Number(v.status) === 1);
  }

  isGlobalInventoryAccepted(roleId: number, variantStatus: number) {
    return Number(roleId) !== 2 && Number(variantStatus) === 1;
  }

  resolveVariantLocation({
    auctionEnabled,
    accountType,
    variantLocation,
  }: {
    auctionEnabled: boolean;
    accountType: number;
    variantLocation: string | null;
  }) {
    if (!auctionEnabled) return variantLocation || null;
    return Number(accountType) === 0 ? 'Drop Ship' : 'Warehouse';
  }

  shouldIncludeVariantImage(store: { is_used_only_products_store?: boolean; is_unique_product_store?: boolean }) {
    return Boolean(store?.is_used_only_products_store || store?.is_unique_product_store);
  }

  resolveVariantOptionValue(variant: Record<string, unknown>, key: string) {
    if (!variant || !key) return null;

    const primary = variant[key];
    if (primary != null && String(primary).trim() !== '') {
      return String(primary).trim();
    }

    const altKey = key.replace(/Value$/, 'value');
    const alternate = variant[altKey];
    if (alternate != null && String(alternate).trim() !== '') {
      return String(alternate).trim();
    }

    return null;
  }

  buildTemplateOptionFields(templateOptionKeys: string[], variant: Record<string, unknown>) {
    const keys = templateOptionKeys || [];
    return {
      option1: keys[0] || variant.option1 || null,
      option1Value: this.resolveVariantOptionValue(variant, 'option1Value'),
      option2: keys[1] || variant.option2 || null,
      option2Value: this.resolveVariantOptionValue(variant, 'option2Value'),
      option3: keys[2] || variant.option3 || null,
      option3Value: this.resolveVariantOptionValue(variant, 'option3Value'),
    };
  }

  async loadTemplateOptionKeys(templateId: string | number, transaction: Transaction) {
    if (!templateId) return [] as string[];

    const rows = await this.sequelize.query<{ optionKey: string }>(
      `SELECT o.option_key AS optionKey, o.option_order AS optionOrder
       FROM template_options t
       JOIN template_option o ON o.id = t.options_id
       WHERE t.template_id = :templateId
         AND (o.active IS NULL OR o.active = 1)
         AND o.option_key IS NOT NULL
         AND TRIM(o.option_key) != ''
       ORDER BY o.option_order ASC`,
      {
        replacements: { templateId },
        type: QueryTypes.SELECT,
        transaction,
      },
    );

    return rows.map((r) => String(r.optionKey || '').trim()).filter(Boolean);
  }

  applyAddPrintQueueRules({
    product,
    variantStatus,
  }: {
    product: { labelStatus?: string; is_print_queue?: boolean };
    variantStatus: number;
  }) {
    const globalFields = {
      is_print_queue: false,
      printQueueLabelType: 'Item',
    };

    if (Number(variantStatus) !== 1) {
      return { globalFields, productUpdate: null as Record<string, unknown> | null };
    }

    const labelStatus = product?.labelStatus || LABEL_STATUS.NOT_PRINTED;
    let productUpdate: Record<string, unknown> | null = null;

    if (labelStatus === LABEL_STATUS.NOT_PRINTED && product?.is_print_queue) {
      productUpdate = {
        is_print_queue: false,
        printQueueLabelType: 'Product',
      };
    }

    return { globalFields, productUpdate };
  }

  async saveProductCustomFields({
    customFields,
    productId,
    storeId,
    transaction,
  }: {
    customFields: { fieldName?: string; tableName?: string; fieldValue?: unknown }[];
    productId: number;
    storeId: number;
    transaction: Transaction;
  }) {
    if (!customFields?.length || !productId) return;

    const rows: Record<string, unknown>[] = [];

    for (const field of customFields) {
      if (!field?.fieldName || !field?.tableName) continue;

      const definition = await this.productRepo.customFieldDefinitionModel.findOne({
        where: {
          table_name: field.tableName,
          field_name: field.fieldName,
          store_id: storeId,
        },
        transaction,
      });

      if (!definition) continue;

      rows.push({
        data_type: definition.data_type,
        field_name: definition.field_name,
        field_value:
          field.fieldValue !== undefined && field.fieldValue !== null
            ? String(field.fieldValue)
            : null,
        store_id: storeId,
        table_name: field.tableName,
        metafield_id: definition.id,
        product_id: productId,
        variant_id: null,
        inventory_id: null,
        template_id: null,
      });
    }

    if (rows.length) {
      await this.productRepo.customFieldValueModel.bulkCreate(rows as any, { transaction });
    }
  }

  async resolveLocationId(locationName: string, storeId: number, transaction: Transaction) {
    if (!locationName) return null;
    return this.inventoryUpdateParity.findBinLocationId(locationName, storeId, transaction);
  }
}
