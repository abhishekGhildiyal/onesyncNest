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
export class OrderItems extends Model<OrderItems> {
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
  orderId: number;

  @Column({
    type: DataType.BIGINT,
    allowNull: true,
    field: 'item_id',
  })
  itemId: number;

  @Column({
    type: DataType.BIGINT,
    allowNull: false,
    field: 'product_id',
  })
  productId: number;

  @Column({
    type: DataType.BIGINT,
    allowNull: false,
    field: 'variant_id',
  })
  variantId: number;

  @Column({
    type: DataType.INTEGER,
    allowNull: false,
  })
  quantity: number;

  @Column({
    type: DataType.DOUBLE,
    allowNull: false,
  })
  price: number;

  @Column({
    type: DataType.STRING,
    allowNull: true,
  })
  status: string;

  @Column({
    type: DataType.BIGINT,
    allowNull: true,
    field: 'inventory_item_id',
  })
  inventoryItemId: number;

  @Column({
    type: DataType.STRING,
    allowNull: true,
    field: 'item_name',
  })
  itemName: string;

  @Column({
    type: DataType.STRING,
    allowNull: true,
  })
  barcode: string;

  @Column({
    type: DataType.STRING,
    allowNull: true,
    field: 'custom_variant_id',
  })
  customVariantId: string;

  @Column({
    type: DataType.STRING,
    allowNull: true,
  })
  size: string;

  @Column({
    type: DataType.STRING,
    allowNull: true,
  })
  location: string;

  @Column({
    type: DataType.INTEGER,
    allowNull: true,
    field: 'store_id',
  })
  storeId: number;

  @Column({
    type: DataType.STRING,
    allowNull: true,
    field: 'item_condition',
  })
  itemCondition: string;

  @Column({
    type: DataType.STRING,
    allowNull: true,
  })
  image: string;

  @Column({
    type: DataType.DATE,
    allowNull: true,
    field: 'order_date',
  })
  orderDate: Date;

  @Column({
    type: DataType.DATE,
    allowNull: true,
    field: 'status_update_time',
  })
  statusUpdateTime: Date;
}
