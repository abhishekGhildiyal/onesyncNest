import { AutoIncrement, Column, DataType, Model, PrimaryKey, Table } from 'sequelize-typescript';
import { Inventory } from '../inventory/inventory';
import { ProductList } from '../product/productList';
import { User } from '../user/user';

@Table({
  tableName: 'variant',
  timestamps: true,
  createdAt: 'created_on',
  updatedAt: false,
  indexes: [
    { name: 'idx_variant_store_id', fields: ['store_id'] },
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
  declare productId: number;

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

  @Column({
    type: DataType.STRING,
    field: 'migration_id',
  })
  declare migrationId: string;

  @Column({
    type: DataType.BIGINT,
    field: 'web_variant_id',
  })
  declare webVariantId: number;

  @Column({
    type: DataType.BIGINT,
    field: 'web_inventory_item_id',
  })
  declare webInventoryItemId: number;

  @Column({
    type: DataType.STRING,
    field: 'sold_source',
    defaultValue: '0',
  })
  declare soldSource: string;

  @Column({
    type: DataType.INTEGER,
    field: 'channel_id',
  })
  declare channelId: number;

  @Column({
    type: DataType.DOUBLE,
  })
  declare discount: number;

  @Column({
    type: DataType.INTEGER,
    field: 'store_location_mapping_id',
  })
  declare storeLocationMappingId: number;

  @Column({ type: DataType.STRING, field: 'variant_image' })
  declare variantImage: string;

  @Column({ type: DataType.STRING, field: 'item_tags' })
  declare itemTags: string;

  @Column({ type: DataType.BOOLEAN, field: 'linked_image', defaultValue: false })
  declare linkedImage: boolean;

  @Column({ type: DataType.STRING, field: 'local_order_no' })
  declare localOrderNo: string;

  @Column({ type: DataType.STRING, field: 'vendor_order_no' })
  declare vendorOrderNo: string;

  @Column({ type: DataType.INTEGER, field: 'purchase_order_id' })
  declare purchaseOrderId: number;

  @Column({ type: DataType.BOOLEAN, field: 'is_payout_custom', defaultValue: false })
  declare isPayoutCustom: boolean;

  @Column({ type: DataType.STRING, field: 'payout_manual', defaultValue: '0' })
  declare payoutManual: string;

  @Column({ type: DataType.STRING, field: 'compare_at_price' })
  declare compare_at_price: string;

  declare inventory?: Inventory;
  declare product?: ProductList;
  declare user?: User;
}
