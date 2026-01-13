import {
  AutoIncrement,
  Column,
  DataType,
  Model,
  PrimaryKey,
  Table,
} from 'sequelize-typescript';

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
  skuNumber: string | null;

  @Column({
    type: DataType.DATE,
    field: 'sold_on',
  })
  soldOn: Date | null;

  @Column({
    type: DataType.STRING,
    field: 'item_name',
  })
  itemName: string | null;

  @Column({
    type: DataType.STRING,
  })
  color: string | null;

  @Column({
    type: DataType.STRING,
    field: 'display_name',
  })
  displayName: string | null;

  @Column({
    type: DataType.STRING,
  })
  image: string | null;

  @Column({
    type: DataType.STRING,
  })
  category: string | null;

  @Column({
    type: DataType.STRING,
    field: 'shopify_status',
  })
  shopifyStatus: string | null;

  @Column({
    type: DataType.STRING,
    field: 'published_scope',
  })
  publishedScope: string | null;

  @Column({
    type: DataType.INTEGER,
    field: 'store_id',
  })
  storeId: number | null;

  @Column({
    type: DataType.INTEGER,
    field: 'account_type',
  })
  accountType: number | null;

  @Column({
    type: DataType.STRING,
    field: 'web_barcode',
  })
  webBarcode: string | null;

  @Column({
    type: DataType.STRING,
  })
  brand: string | null;

  @Column({
    type: DataType.STRING,
  })
  template: string | null;

  @Column({
    type: DataType.STRING,
  })
  type: string | null;

  @Column({
    type: DataType.STRING,
    field: 'shopify_id',
  })
  shopifyId: string;

  @Column({
    type: DataType.INTEGER,
    field: 'product_id',
  })
  productId: number;

  @Column({
    type: DataType.BOOLEAN,
    defaultValue: true,
    allowNull: false,
    field: 'is_visible',
  })
  isVisible: boolean;

  @Column({
    type: DataType.DATE,
    field: 'accepted_on',
  })
  acceptedOn: Date;

  @Column({
    type: DataType.INTEGER,
    field: 'user_id',
  })
  user_id: number;
}
