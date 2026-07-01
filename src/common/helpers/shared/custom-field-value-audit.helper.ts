import { InjectConnection } from '@nestjs/sequelize';
import { Injectable } from '@nestjs/common';
import { QueryTypes, Transaction } from 'sequelize';
import { Sequelize } from 'sequelize-typescript';
import { ProductRepository } from 'src/db/repository/product.repository';

export const REVTYPE = { ADD: 0, MOD: 1, DEL: 2 } as const;

export const AUDITED_FIELDS: [string, string][] = [
  ['data_type', 'data_type_mod'],
  ['field_name', 'field_name_mod'],
  ['field_value', 'field_value_mod'],
  ['store_id', 'store_id_mod'],
  ['table_name', 'table_name_mod'],
  ['metafield_id', 'definition_mod'],
  ['inventory_id', 'inventory_mod'],
  ['product_id', 'product_mod'],
  ['template_id', 'template_mod'],
  ['variant_id', 'variant_mod'],
];

const normalizeValue = (val: unknown) => {
  if (val === undefined || val === null) return null;
  return String(val);
};

const isFieldChanged = (existing: Record<string, unknown>, next: Record<string, unknown>, field: string) =>
  normalizeValue(existing?.[field]) !== normalizeValue(next?.[field]);

const hasAnyModification = (auditRow: Record<string, unknown>) =>
  AUDITED_FIELDS.some(([, modField]) => auditRow[modField] === true || auditRow[modField] === 1);

@Injectable()
export class CustomFieldValueAuditHelper {
  constructor(
    private readonly productRepo: ProductRepository,
    @InjectConnection() private readonly sequelize: Sequelize,
  ) {}

  async createCustomFieldRevision(transaction: Transaction, username = 'SYSTEM'): Promise<number> {
    const [row] = await this.sequelize.query<{ nextId: number }>(
      'SELECT COALESCE(MAX(id), 0) + 1 AS nextId FROM revinfo',
      { transaction, type: QueryTypes.SELECT },
    );
    const nextId = row.nextId;

    await this.productRepo.revinfoModel.create(
      { id: nextId, timestamp: Date.now(), username: username || 'SYSTEM' },
      { transaction },
    );

    return nextId;
  }

  buildAddAuditRow(row: Record<string, unknown>, rev: number) {
    const auditRow: Record<string, unknown> = { id: row.id, rev, revtype: REVTYPE.ADD };
    for (const [field, modField] of AUDITED_FIELDS) {
      auditRow[field] = row[field] ?? null;
      auditRow[modField] = true;
    }
    return auditRow;
  }

  buildModAuditRow(existing: Record<string, unknown>, next: Record<string, unknown>, rev: number) {
    const auditRow: Record<string, unknown> = { id: existing.id, rev, revtype: REVTYPE.MOD };
    for (const [field, modField] of AUDITED_FIELDS) {
      const changed = isFieldChanged(existing, next, field);
      auditRow[field] = next[field] ?? null;
      auditRow[modField] = changed;
    }
    return hasAnyModification(auditRow) ? auditRow : null;
  }

  buildDelAuditRow(existing: Record<string, unknown>, rev: number) {
    const auditRow: Record<string, unknown> = { id: existing.id, rev, revtype: REVTYPE.DEL };
    for (const [field, modField] of AUDITED_FIELDS) {
      auditRow[field] = null;
      auditRow[modField] = true;
    }
    return auditRow;
  }

  rowHasChanges(existing: Record<string, unknown>, next: Record<string, unknown>) {
    return AUDITED_FIELDS.some(([field]) => isFieldChanged(existing, next, field));
  }
}
