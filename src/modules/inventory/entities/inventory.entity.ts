import { Table, Column, Model, DataType, HasMany, BelongsTo, ForeignKey } from 'sequelize-typescript';
import { Variant } from '../../products/entities/variant.entity';
import { ProductList } from '../../products/entities/product-list.entity';
import { User } from '../../users/entities/user.entity';

@Table({
  tableName: 'inventory',
  timestamps: true,
  createdAt: 'created_on',
  updatedAt: 'update_on',
})
export class Inventory extends Model {
  @Column({
    type: DataType.INTEGER,
    autoIncrement: true,
    primaryKey: true,
    field: 'item_id',
  })
  declare id: number;

  @Column({
    type: DataType.STRING,
    allowNull: false,
    field: 'sku_number',
  })
  skuNumber: string;

  @Column({
    type: DataType.DATE,
    field: 'sold_on',
  })
  soldOn: Date;

  @Column({
    type: DataType.STRING,
    field: 'item_name',
  })
  itemName: string;

  @Column(DataType.STRING)
  color: string;

  @Column({
    type: DataType.STRING,
    field: 'display_name',
  })
  displayName: string;

  @Column(DataType.STRING)
  image: string;

  @Column(DataType.STRING)
  category: string;

  @Column({
    type: DataType.STRING,
    field: 'shopify_status',
  })
  shopifyStatus: string;

  @Column({
    type: DataType.STRING,
    field: 'published_scope',
  })
  publishedScope: string;

  @Column({
    type: DataType.INTEGER,
    field: 'store_id',
  })
  storeId: number;

  @Column({
    type: DataType.INTEGER,
    field: 'account_type',
  })
  accountType: number;

  @Column({
    type: DataType.STRING,
    field: 'web_barcode',
  })
  webBarcode: string;

  @Column(DataType.STRING)
  brand: string;

  @Column(DataType.STRING)
  template: string;

  @Column(DataType.STRING)
  type: string;

  @Column({
    type: DataType.STRING,
    field: 'shopify_id',
  })
  shopifyId: string;

  @ForeignKey(() => ProductList)
  @Column({
    type: DataType.INTEGER,
    field: 'product_id',
  })
  productId: number;

  @BelongsTo(() => ProductList)
  productList: ProductList;

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

  @ForeignKey(() => User)
  @Column({
    type: DataType.INTEGER,
    field: 'user_id',
  })
  userId: number;

  @BelongsTo(() => User)
  user: User;

  @HasMany(() => Variant, {
    foreignKey: 'item_id',
    onDelete: 'CASCADE',
    hooks: true,
  })
  variants: Variant[];
}
