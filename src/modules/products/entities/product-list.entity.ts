import { Table, Column, Model, DataType, PrimaryKey, AutoIncrement, ForeignKey, BelongsTo, HasMany, BeforeSave } from 'sequelize-typescript';
import { Brand } from './brand.entity';
import { Variant } from './variant.entity';

@Table({
  tableName: 'porduct_list',
  timestamps: false,
})
export class ProductList extends Model {
  @PrimaryKey
  @AutoIncrement
  @Column({
    type: DataType.INTEGER,
    field: 'product_id',
  })
  declare product_id: number;

  @Column({
    type: DataType.STRING(255),
    field: 'sku_number',
  })
  skuNumber: string;

  @Column({
    type: DataType.STRING,
    allowNull: false,
    field: 'item_name',
  })
  itemName: string;

  @Column(DataType.STRING)
  image: string;

  @Column(DataType.STRING)
  category: string;

  @Column(DataType.STRING)
  brand: string;

  @ForeignKey(() => Brand)
  @Column(DataType.INTEGER)
  brand_id: number;

  @BelongsTo(() => Brand)
  brandData: Brand;

  @Column(DataType.STRING)
  template: string;

  @Column(DataType.STRING)
  color: string;

  @Column(DataType.STRING)
  handle: string;

  @Column({
    type: DataType.INTEGER,
    allowNull: false,
    field: 'store_id',
  })
  storeId: number;

  @Column({
    type: DataType.BOOLEAN,
    defaultValue: false,
    field: 'is_store_only',
  })
  isStoreOnly: boolean;

  @Column(DataType.INTEGER)
  stock: number;

  @Column(DataType.INTEGER)
  sold: number;

  @Column({
    type: DataType.INTEGER,
    field: 'need_approval',
  })
  needApproval: number;

  @Column(DataType.STRING)
  description: string;

  @Column(DataType.STRING)
  type: string;

  @Column({
    type: DataType.STRING,
    field: 'stockxstyle_id',
  })
  stockXStyleId: string;

  @Column({
    type: DataType.STRING,
    field: 'stockxsize_chart',
  })
  stockXSizeChart: string;

  @Column({
    type: DataType.DATE,
    field: 'created_by',
    defaultValue: DataType.NOW,
  })
  createdBy: Date;

  @Column({
    type: DataType.DATE,
    field: 'updated_by',
    defaultValue: DataType.NOW,
  })
  updatedBy: Date;

  @HasMany(() => Variant, {
    foreignKey: 'productId',
    onDelete: 'CASCADE',
    hooks: true,
  })
  variants: Variant[];

  @BeforeSave
  static slugify(instance: ProductList) {
    if (instance.handle) {
      instance.handle = instance.handle
        .replace(/[^a-zA-Z0-9\s]/g, '')
        .replace(/\s+/g, '-')
        .toLowerCase();
    }
    if (instance.skuNumber) {
      instance.skuNumber = instance.skuNumber.trim();
    }
  }
}
