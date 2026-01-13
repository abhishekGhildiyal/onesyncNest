// src/database/entities/audit.entity.ts
import {
  AutoIncrement,
  Column,
  DataType,
  Model,
  PrimaryKey,
  Table,
} from 'sequelize-typescript';

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
  originalVariantId: string;

  @Column({
    type: DataType.STRING,
    allowNull: true,
    field: 'sku',
  })
  sku: string;

  @Column({
    type: DataType.STRING,
    allowNull: true,
    field: 'item_name',
  })
  itemName: string;

  @Column({
    type: DataType.STRING,
    allowNull: true,
    field: 'shopify_id',
  })
  shopifyId: string;

  @Column({
    type: DataType.STRING,
    allowNull: true,
    field: 'inventory_item_id',
  })
  inventoryItemId: string;

  @Column({
    type: DataType.DOUBLE,
    allowNull: true,
    field: 'price',
  })
  price: number;

  @Column({
    type: DataType.STRING,
    allowNull: true,
    field: 'product_id',
  })
  productId: string;

  @Column({
    type: DataType.STRING,
    allowNull: true,
    field: 'audit_type',
  })
  auditType: string;

  @Column({
    type: DataType.STRING,
    allowNull: true,
    field: 'option1',
  })
  option1: string;

  @Column({
    type: DataType.STRING,
    allowNull: true,
    field: 'option2',
  })
  option2: string;

  @Column({
    type: DataType.STRING,
    allowNull: true,
    field: 'option3',
  })
  option3: string;

  @Column({
    type: DataType.STRING(255),
    allowNull: true,
    field: 'created_at',
  })
  declare createdAt: string;
}
