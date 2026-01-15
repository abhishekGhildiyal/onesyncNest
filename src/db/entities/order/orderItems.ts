import {
  AutoIncrement,
  Column,
  DataType,
  Model,
  PrimaryKey,
  Table,
} from 'sequelize-typescript';

@Table({
  tableName: 'order_items',
  timestamps: true,
  createdAt: 'created_date',
  updatedAt: false,
})
export class OrderItems extends Model {
  @PrimaryKey
  @AutoIncrement
  @Column({
    type: DataType.BIGINT,
  })
  declare id: number;

  @Column({
    type: DataType.BIGINT,
    allowNull: false,
    field: 'order_id',
  })
  declare orderId: number;

  @Column({
    type: DataType.BIGINT,
    allowNull: true,
    field: 'item_id',
  })
  declare itemId: number;

  @Column({
    type: DataType.BIGINT,
    allowNull: false,
    field: 'product_id',
  })
  declare productId: number;

  @Column({
    type: DataType.BIGINT,
    allowNull: false,
    field: 'variant_id',
  })
  declare variantId: number;

  @Column({
    type: DataType.INTEGER,
    allowNull: false,
  })
  declare quantity: number;

  @Column({
    type: DataType.DOUBLE,
    allowNull: false,
  })
  declare price: number;

  @Column({
    type: DataType.STRING,
    allowNull: true,
  })
  declare status: string;

  @Column({
    type: DataType.BIGINT,
    allowNull: true,
    field: 'inventory_item_id',
  })
  declare inventoryItemId: number;

  @Column({
    type: DataType.STRING,
    allowNull: true,
    field: 'item_name',
  })
  declare itemName: string;

  @Column({
    type: DataType.STRING,
    allowNull: true,
  })
  declare barcode: string;

  @Column({
    type: DataType.STRING,
    allowNull: true,
    field: 'custom_variant_id',
  })
  declare customVariantId: string;

  @Column({
    type: DataType.STRING,
    allowNull: true,
  })
  declare size: string;

  @Column({
    type: DataType.STRING,
    allowNull: true,
  })
  declare location: string;

  @Column({
    type: DataType.INTEGER,
    allowNull: true,
    field: 'store_id',
  })
  declare storeId: number;

  @Column({
    type: DataType.STRING,
    allowNull: true,
    field: 'item_condition',
  })
  declare itemCondition: string;

  @Column({
    type: DataType.STRING,
    allowNull: true,
  })
  declare image: string;

  @Column({
    type: DataType.DATE,
    allowNull: true,
    field: 'order_date',
  })
  declare orderDate: Date;

  @Column({
    type: DataType.DATE,
    allowNull: true,
    field: 'status_update_time',
  })
  declare statusUpdateTime: Date;
}
