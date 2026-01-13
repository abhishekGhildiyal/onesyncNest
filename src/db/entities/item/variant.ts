import {
  AutoIncrement,
  Column,
  DataType,
  Model,
  PrimaryKey,
  Table,
} from 'sequelize-typescript';

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
export class Variant extends Model<Variant> {
  @PrimaryKey
  @AutoIncrement
  @Column({
    type: DataType.INTEGER,
  })
  declare id: number;

  @Column({
    type: DataType.STRING,
  })
  option1: string;

  @Column({
    type: DataType.STRING,
  })
  option1Value: string;

  @Column({
    type: DataType.STRING,
  })
  option2: string;

  @Column({
    type: DataType.STRING,
  })
  option2Value: string;

  @Column({
    type: DataType.STRING,
  })
  option3: string;

  @Column({
    type: DataType.STRING,
  })
  option3Value: string;

  @Column({
    type: DataType.STRING,
  })
  note: string;

  @Column({
    type: DataType.STRING,
    allowNull: true,
  })
  barcode_numeric: string;

  @Column({
    type: DataType.DATE,
  })
  accepted_on: Date;

  @Column({
    type: DataType.INTEGER,
  })
  store_id: number;

  @Column({
    type: DataType.DATE,
  })
  purchase_date: Date;

  @Column({
    type: DataType.STRING,
  })
  purchase_order_no: string;

  @Column({
    type: DataType.STRING,
  })
  purchase_from_vendor: string;

  @Column({
    type: DataType.BIGINT,
  })
  order_id: number;

  @Column({
    type: DataType.INTEGER,
  })
  original_quantity: number;

  @Column({
    type: DataType.INTEGER,
  })
  variant_id: number;

  @Column({
    type: DataType.STRING(255),
  })
  barcode: string;

  @Column({
    type: DataType.INTEGER,
    field: 'account_type',
  })
  accountType: number;

  @Column({
    type: DataType.DOUBLE,
  })
  fee: number;

  @Column({
    type: DataType.DOUBLE,
  })
  weight: number;

  @Column({
    type: DataType.DOUBLE,
    defaultValue: 0,
    allowNull: false,
  })
  payout: number;

  @Column({
    type: DataType.STRING,
  })
  variant_inventory_id: string;

  @Column({
    type: DataType.DOUBLE,
  })
  price: number;

  @Column({
    type: DataType.STRING,
  })
  location: string;

  @Column({
    type: DataType.INTEGER,
  })
  quantity: number;

  @Column({
    type: DataType.STRING,
  })
  source_name: string;

  @Column({
    type: DataType.DOUBLE,
    field: 'purchase_price',
  })
  cost: number;

  @Column({
    type: DataType.INTEGER,
    field: 'status',
  })
  status: number;

  @Column({
    type: DataType.BIGINT,
  })
  payout_id: number;

  @Column({
    type: DataType.INTEGER,
    field: 'product_id',
  })
  productId: number;

  @Column({
    type: DataType.STRING,
  })
  custom_variant_id: string;

  @Column({
    type: DataType.STRING,
  })
  web_barcode: string;

  @Column({
    type: DataType.BIGINT,
  })
  location_id: number;

  @Column({
    type: DataType.DOUBLE,
  })
  requested_price: number;

  @Column({
    type: DataType.STRING,
  })
  payment_form: string;

  @Column({
    type: DataType.BOOLEAN,
    allowNull: true,
    defaultValue: false,
  })
  is_shopify_order: boolean;

  @Column({
    type: DataType.BOOLEAN,
    allowNull: true,
  })
  is_consumer_order: boolean;

  @Column({
    type: DataType.INTEGER,
    field: 'item_id',
  })
  inventoryId: number;

  @Column({
    type: DataType.INTEGER,
  })
  user_id: number;
}
