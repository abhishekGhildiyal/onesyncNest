import { AutoIncrement, Column, DataType, Model, PrimaryKey, Table } from 'sequelize-typescript';

@Table({
  tableName: 'variant',
  timestamps: true,
  createdAt: 'created_on',
  updatedAt: false,
  indexes: [
    { name: 'idx_variant_store_id', fields: ['storeId'] },
    { name: 'idx_variant_location', fields: ['location'] },
  ],
})
export class Variant extends Model {
  @PrimaryKey
  @AutoIncrement
  @Column({
    type: DataType.INTEGER,
  })
  declare id: number;

  @Column({
    type: DataType.STRING,
  })
  declare option1: string;

  @Column({
    type: DataType.STRING,
  })
  declare option1Value: string;

  @Column({
    type: DataType.STRING,
  })
  declare option2: string;

  @Column({
    type: DataType.STRING,
  })
  declare option2Value: string;

  @Column({
    type: DataType.STRING,
  })
  declare option3: string;

  @Column({
    type: DataType.STRING,
  })
  declare option3Value: string;

  @Column({
    type: DataType.STRING,
  })
  declare note: string;

  @Column({
    type: DataType.STRING,
    allowNull: true,
  })
  declare barcode_numeric: string;

  @Column({
    type: DataType.DATE,
  })
  declare accepted_on: Date;

  @Column({
    type: DataType.INTEGER,
  })
  declare store_id: number;

  @Column({
    type: DataType.DATE,
  })
  declare purchase_date: Date;

  @Column({
    type: DataType.STRING,
  })
  declare purchase_order_no: string;

  @Column({
    type: DataType.STRING,
  })
  declare purchase_from_vendor: string;

  @Column({
    type: DataType.BIGINT,
  })
  declare order_id: number;

  @Column({
    type: DataType.INTEGER,
  })
  declare original_quantity: number;

  @Column({
    type: DataType.INTEGER,
  })
  declare variant_id: number;

  @Column({
    type: DataType.STRING(255),
  })
  declare barcode: string;

  @Column({
    type: DataType.INTEGER,
    field: 'account_type',
  })
  declare accountType: number;

  @Column({
    type: DataType.DOUBLE,
  })
  declare fee: number;

  @Column({
    type: DataType.DOUBLE,
  })
  declare weight: number;

  @Column({
    type: DataType.DOUBLE,
    defaultValue: 0,
    allowNull: false,
  })
  declare payout: number;

  @Column({
    type: DataType.STRING,
  })
  declare variant_inventory_id: string;

  @Column({
    type: DataType.DOUBLE,
  })
  declare price: number;

  @Column({
    type: DataType.STRING,
  })
  declare location: string;

  @Column({
    type: DataType.INTEGER,
  })
  declare quantity: number;

  @Column({
    type: DataType.STRING,
  })
  declare source_name: string;

  @Column({
    type: DataType.DOUBLE,
    field: 'purchase_price',
  })
  declare cost: number;

  @Column({
    type: DataType.INTEGER,
    field: 'status',
  })
  declare status: number;

  @Column({
    type: DataType.BIGINT,
  })
  declare payout_id: number;

  @Column({
    type: DataType.INTEGER,
    field: 'product_id',
  })
  declare product_id: number;

  @Column({
    type: DataType.STRING,
  })
  declare custom_variant_id: string;

  @Column({
    type: DataType.STRING,
  })
  declare web_barcode: string;

  @Column({
    type: DataType.BIGINT,
  })
  declare location_id: number;

  @Column({
    type: DataType.DOUBLE,
  })
  declare requested_price: number;

  @Column({
    type: DataType.STRING,
  })
  declare payment_form: string;

  @Column({
    type: DataType.BOOLEAN,
    allowNull: true,
    defaultValue: false,
  })
  declare is_shopify_order: boolean;

  @Column({
    type: DataType.BOOLEAN,
    allowNull: true,
  })
  declare is_consumer_order: boolean;

  @Column({
    type: DataType.INTEGER,
    field: 'item_id',
  })
  declare inventoryId: number;

  @Column({
    type: DataType.INTEGER,
  })
  declare user_id: number;
}
