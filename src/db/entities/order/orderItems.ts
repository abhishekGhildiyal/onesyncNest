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
  timestamps: false,
})
export class OrderItems extends Model {
  @PrimaryKey
  @AutoIncrement
  @Column({
    type: DataType.BIGINT,
  })
  declare id: number;

  @Column({
    type: DataType.STRING,
    allowNull: false,
    field: 'created_date',
  })
  declare createdDate: string;

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

  @Column({
    type: DataType.BIGINT,
    allowNull: true,
    field: 'fulfillment_id',
  })
  declare fulfillmentId: number;

  @Column({
    type: DataType.BIGINT,
    allowNull: true,
    field: 'order_link',
  })
  declare orderLink: number;

  @Column({
    type: DataType.DECIMAL(19, 2),
    allowNull: true,
    field: 'final_price',
  })
  declare finalPrice: number;

  @Column({
    type: DataType.STRING,
    allowNull: true,
    field: 'display_name',
  })
  declare displayName: string;

  @Column({
    type: DataType.STRING,
    allowNull: true,
    field: 'fulfillment_status',
  })
  declare fulfillmentStatus: string;

  @Column({
    type: DataType.STRING,
    allowNull: true,
    field: 'payment_status',
  })
  declare paymentStatus: string;

  @Column({
    type: DataType.DOUBLE,
    allowNull: true,
  })
  declare weight: number;

  @Column({
    type: DataType.STRING,
    allowNull: true,
  })
  declare sku: string;

  @Column({
    type: DataType.INTEGER,
    allowNull: true,
    field: 'discount_type',
  })
  declare discountType: number;

  @Column({
    type: DataType.DECIMAL(19, 2),
    allowNull: true,
    field: 'discount_value',
  })
  declare discountValue: number;

  @Column({
    type: DataType.STRING,
    allowNull: true,
    field: 'discount_reason',
  })
  declare discountReason: string;

  @Column({
    type: DataType.STRING,
    allowNull: true,
    field: 'web_barcode',
  })
  declare webBarcode: string;

  @Column({
    type: DataType.STRING,
    allowNull: true,
    field: 'seller_email',
  })
  declare sellerEmail: string;

  @Column({
    type: DataType.TEXT,
    allowNull: true,
    field: 'reason_for_return',
  })
  declare reasonForReturn: string;
}
