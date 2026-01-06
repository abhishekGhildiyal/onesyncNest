import { Table, Column, Model, DataType, PrimaryKey, AutoIncrement, ForeignKey, BelongsTo } from 'sequelize-typescript';
import { ProductList } from './product-list.entity';
import { Inventory } from '../../inventory/entities/inventory.entity';

@Table({
  tableName: 'variant',
  timestamps: true,
  createdAt: 'created_on',
  updatedAt: false,
})
export class Variant extends Model {
  @PrimaryKey
  @AutoIncrement
  @Column(DataType.INTEGER)
  declare id: number;

  @Column(DataType.STRING)
  option1: string;

  @Column(DataType.STRING)
  option1Value: string;

  @Column(DataType.STRING)
  option2: string;

  @Column(DataType.STRING)
  option2Value: string;

  @Column(DataType.STRING)
  option3: string;

  @Column(DataType.STRING)
  option3Value: string;

  @Column(DataType.STRING)
  note: string;

  @Column(DataType.STRING)
  barcode_numeric: string;

  @Column(DataType.DATE)
  accepted_on: Date;

  @Column(DataType.INTEGER)
  store_id: number;

  @Column(DataType.DATE)
  purchase_date: Date;

  @Column(DataType.STRING)
  purchase_order_no: string;

  @Column(DataType.STRING)
  purchase_from_vendor: string;

  @Column(DataType.BIGINT)
  order_id: number;

  @Column(DataType.INTEGER)
  original_quantity: number;

  @Column(DataType.INTEGER)
  variant_id: number;

  @Column(DataType.STRING(255))
  barcode: string;

  @Column({
    type: DataType.INTEGER,
    field: 'account_type',
  })
  accountType: number;

  @Column(DataType.DOUBLE)
  fee: number;

  @Column(DataType.DOUBLE)
  weight: number;

  @Column({
    type: DataType.DOUBLE,
    defaultValue: 0,
    allowNull: false,
  })
  payout: number;

  @Column(DataType.STRING)
  variant_inventory_id: string;

  @Column(DataType.DOUBLE)
  price: number;

  @Column(DataType.STRING)
  location: string;

  @Column(DataType.INTEGER)
  quantity: number;

  @Column(DataType.STRING)
  source_name: string;

  @Column({
    type: DataType.DOUBLE,
    field: 'purchase_price',
  })
  cost: number;

  @Column(DataType.INTEGER)
  status: number;

  @Column(DataType.BIGINT)
  payout_id: number;

  @ForeignKey(() => ProductList)
  @Column({
    type: DataType.INTEGER,
    field: 'product_id',
  })
  productId: number;

  @BelongsTo(() => ProductList)
  product: ProductList;

  @Column(DataType.STRING)
  custom_variant_id: string;

  @Column(DataType.STRING)
  web_barcode: string;

  @Column(DataType.BIGINT)
  location_id: number;

  @Column(DataType.DOUBLE)
  requested_price: number;

  @Column(DataType.STRING)
  payment_form: string;

  @Column({
    type: DataType.BOOLEAN,
    defaultValue: false,
  })
  is_shopify_order: boolean;

  @Column(DataType.BOOLEAN)
  is_consumer_order: boolean;

  @ForeignKey(() => Inventory)
  @Column({
    type: DataType.INTEGER,
    field: 'item_id',
  })
  inventoryId: number;

  @BelongsTo(() => Inventory)
  inventory: Inventory;

  @Column(DataType.INTEGER)
  user_id: number;
}
