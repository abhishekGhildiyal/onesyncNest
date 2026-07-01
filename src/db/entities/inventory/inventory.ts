import { AutoIncrement, Column, DataType, Model, PrimaryKey, Table } from 'sequelize-typescript';

@Table({
  tableName: 'inventory',
  timestamps: true,
  createdAt: 'created_on',
  updatedAt: 'update_on',
})
export class Inventory extends Model {
  @PrimaryKey
  @AutoIncrement
  @Column({
    type: DataType.INTEGER,
    field: 'item_id',
  })
  declare id: number;

  @Column({
    type: DataType.STRING,
    allowNull: false,
    field: 'sku_number',
  })
  declare skuNumber: string | null;

  @Column({
    type: DataType.DATE,
    field: 'sold_on',
  })
  declare soldOn: Date | null;

  @Column({
    type: DataType.STRING,
    field: 'item_name',
  })
  declare itemName: string | null;

  @Column({
    type: DataType.STRING,
  })
  declare color: string | null;

  @Column({
    type: DataType.STRING,
    field: 'display_name',
  })
  declare displayName: string | null;

  @Column({
    type: DataType.STRING,
  })
  declare image: string | null;

  @Column({
    type: DataType.STRING,
  })
  declare category: string | null;

  @Column({
    type: DataType.STRING,
    field: 'shopify_status',
  })
  declare shopifyStatus: string | null;

  @Column({
    type: DataType.STRING,
    field: 'published_scope',
  })
  declare publishedScope: string | null;

  @Column({
    type: DataType.INTEGER,
    field: 'store_id',
  })
  declare storeId: number | null;

  @Column({
    type: DataType.INTEGER,
    field: 'account_type',
  })
  declare accountType: number | null;

  @Column({
    type: DataType.STRING,
    field: 'web_barcode',
  })
  declare webBarcode: string | null;

  @Column({
    type: DataType.STRING,
  })
  declare brand: string | null;

  @Column({
    type: DataType.STRING,
  })
  declare template: string | null;

  @Column({
    type: DataType.STRING,
  })
  declare type: string | null;

  @Column({
    type: DataType.STRING,
    field: 'shopify_id',
  })
  declare shopifyId: string;

  @Column({
    type: DataType.INTEGER,
    field: 'product_id',
  })
  declare productId: number;

  @Column({
    type: DataType.BOOLEAN,
    defaultValue: true,
    allowNull: false,
    field: 'is_visible',
  })
  declare isVisible: boolean;

  @Column({
    type: DataType.DATE,
    field: 'accepted_on',
  })
  declare acceptedOn: Date;

  @Column({
    type: DataType.INTEGER,
    field: 'user_id',
  })
  declare user_id: number;

  @Column({
    type: DataType.BIGINT,
    allowNull: true,
    field: 'source_order_item_id',
  })
  declare sourceOrderItemId: number;

  @Column({
    type: DataType.BOOLEAN,
    allowNull: false,
    defaultValue: false,
    field: 'is_print_queue',
  })
  declare is_print_queue: boolean;

  @Column({
    type: DataType.BOOLEAN,
    defaultValue: false,
    field: 'auction_enabled',
  })
  declare auctionEnabled: boolean;

  @Column({
    type: DataType.BOOLEAN,
    defaultValue: false,
    field: 'linked_image',
  })
  declare linkedImage: boolean;

  @Column({
    type: DataType.STRING,
    field: 'print_queue_label_type',
  })
  declare printQueueLabelType: string;

  @Column({
    type: DataType.DATE,
    field: 'last_label_print_date',
  })
  declare lastLabelPrintDate: Date;

  @Column({
    type: DataType.DATE,
    field: 'deleted_at',
  })
  declare deletedAt: Date;
}
