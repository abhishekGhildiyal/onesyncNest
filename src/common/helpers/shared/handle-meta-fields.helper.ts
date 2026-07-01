import { Injectable } from '@nestjs/common';
import { Op, Transaction } from 'sequelize';
import { ProductRepository } from 'src/db/repository/product.repository';
import { CustomFieldValueAuditHelper } from './custom-field-value-audit.helper';

export interface CustomFieldInput {
  fieldName?: string;
  fieldValue?: unknown;
  tableName?: string;
}

@Injectable()
export class HandleMetaFieldsHelper {
  constructor(
    private readonly productRepo: ProductRepository,
    private readonly customFieldAudit: CustomFieldValueAuditHelper,
  ) {}

  async handleCustomMetaFields({
    customFields,
    storeId,
    variantId,
    transaction,
    rev,
    username,
  }: {
    customFields?: CustomFieldInput[];
    storeId: number;
    variantId: number;
    transaction: Transaction;
    rev?: number;
    username?: string;
  }) {
    if (!customFields?.length || !variantId) return;

    let revision = rev;
    if (revision == null) {
      revision = await this.customFieldAudit.createCustomFieldRevision(transaction, username);
    }

    const fieldNames = new Set<string>();
    customFields.forEach((field) => {
      if (field?.fieldName) fieldNames.add(field.fieldName.trim());
    });
    if (!fieldNames.size) return;

    const definitions = await this.productRepo.customFieldDefinitionModel.findAll({
      where: {
        store_id: storeId,
        field_name: { [Op.in]: [...fieldNames] },
      },
      transaction,
    });

    const definitionMap = new Map<string, (typeof definitions)[0]>();
    definitions.forEach((definition) => {
      definitionMap.set(definition.field_name.trim().toLowerCase(), definition);
    });

    const valueRows: Record<string, unknown>[] = [];
    for (const field of customFields) {
      if (!field?.fieldName) continue;
      const definition = definitionMap.get(field.fieldName.trim().toLowerCase());
      if (!definition) continue;

      valueRows.push({
        data_type: definition.data_type,
        field_name: definition.field_name,
        field_value:
          field.fieldValue !== undefined && field.fieldValue !== null
            ? String(field.fieldValue)
            : null,
        store_id: storeId,
        table_name: field.tableName || definition.table_name || 'Item',
        metafield_id: definition.id,
        variant_id: variantId,
        product_id: null,
        inventory_id: null,
        template_id: null,
      });
    }

    if (!valueRows.length) return;

    const existingValues = await this.productRepo.customFieldValueModel.findAll({
      where: { variant_id: variantId },
      transaction,
    });

    const existingMap = new Map<string, (typeof existingValues)[0]>();
    existingValues.forEach((row) => {
      existingMap.set(`${row.metafield_id}_${row.variant_id}`, row);
    });

    const insertRows: Record<string, unknown>[] = [];
    const updateRows: Record<string, unknown>[] = [];
    const auditRows: Record<string, unknown>[] = [];

    for (const row of valueRows) {
      const key = `${row.metafield_id}_${row.variant_id}`;
      const existing = existingMap.get(key);

      if (existing) {
        if (!this.customFieldAudit.rowHasChanges(existing.get({ plain: true }), row)) continue;
        updateRows.push({ id: existing.id, ...row });
        const modAuditRow = this.customFieldAudit.buildModAuditRow(
          existing.get({ plain: true }),
          row,
          revision!,
        );
        if (modAuditRow) auditRows.push(modAuditRow);
      } else {
        insertRows.push(row);
      }
    }

    let insertedRows: (typeof existingValues)[0][] = [];
    if (insertRows.length) {
      insertedRows = await this.productRepo.customFieldValueModel.bulkCreate(insertRows as any, {
        transaction,
        returning: true,
      });
      insertedRows.forEach((row) => {
        auditRows.push(this.customFieldAudit.buildAddAuditRow(row.get({ plain: true }), revision!));
      });
    }

    if (updateRows.length) {
      await this.productRepo.customFieldValueModel.bulkCreate(updateRows as any, {
        updateOnDuplicate: ['field_value', 'data_type', 'field_name', 'table_name'],
        transaction,
      });
    }

    if (auditRows.length) {
      await this.productRepo.customFieldValueAudModel.bulkCreate(auditRows as any, { transaction });
    }
  }

  async handleBulkCustomMetaFields({
    createdVariants,
    variantBatch,
    storeId,
    transaction,
    username,
  }: {
    createdVariants: { id: number }[];
    variantBatch: { customFields?: CustomFieldInput[] }[];
    storeId: number;
    transaction: Transaction;
    username?: string;
  }) {
    if (!createdVariants?.length) return;

    const rev = await this.customFieldAudit.createCustomFieldRevision(transaction, username);

    for (let i = 0; i < createdVariants.length; i++) {
      await this.handleCustomMetaFields({
        customFields: variantBatch[i]?.customFields || [],
        storeId,
        variantId: createdVariants[i].id,
        transaction,
        rev,
      });
    }
  }
}
