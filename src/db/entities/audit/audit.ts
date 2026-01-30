// src/database/entities/audit.entity.ts
import { AutoIncrement, Column, DataType, Model, PrimaryKey, Table } from 'sequelize-typescript';

@Table({
  tableName: 'audit',
  timestamps: false,
})
export class Audit extends Model {
  @PrimaryKey
  @AutoIncrement
  @Column({
    type: DataType.INTEGER,
    field: 'id',
  })
  declare id: number;

  @Column({
    type: DataType.STRING,
    allowNull: true,
    field: 'original_variant_id',
  })
  declare originalVariantId: string;

  @Column({
    type: DataType.STRING,
    allowNull: true,
    field: 'sku',
  })
  declare sku: string;

  @Column({
    type: DataType.STRING,
    allowNull: true,
    field: 'item_name',
  })
  declare itemName: string;

  @Column({
    type: DataType.STRING,
    allowNull: true,
    field: 'shopify_id',
  })
  declare shopifyId: string;

  @Column({
    type: DataType.STRING,
    allowNull: true,
    field: 'inventory_item_id',
  })
  declare inventoryItemId: string;

  @Column({
    type: DataType.DOUBLE,
    allowNull: true,
    field: 'price',
  })
  declare price: number;

  @Column({
    type: DataType.STRING,
    allowNull: true,
    field: 'product_id',
  })
  declare product_id: string;

  @Column({
    type: DataType.STRING,
    allowNull: true,
    field: 'audit_type',
  })
  declare auditType: string;

  @Column({
    type: DataType.STRING,
    allowNull: true,
    field: 'option1',
  })
  declare option1: string;

  @Column({
    type: DataType.STRING,
    allowNull: true,
    field: 'option2',
  })
  declare option2: string;

  @Column({
    type: DataType.STRING,
    allowNull: true,
    field: 'option3',
  })
  declare option3: string;

  @Column({
    type: DataType.STRING(255),
    allowNull: true,
    field: 'created_at',
  })
  declare createdAt: string;
}
