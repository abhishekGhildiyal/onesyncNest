import {
  AutoIncrement,
  BeforeSave,
  Column,
  DataType,
  Model,
  PrimaryKey,
  Table,
} from 'sequelize-typescript';
import { Variant } from '../item/variant';
import { TagSource } from '../tags/tagSource';
import { Brands } from './brand';

@Table({
  tableName: 'porduct_list',
  timestamps: false,
  indexes: [
    {
      name: 'uk_product_sku_store',
      unique: true,
      fields: ['sku_number', 'store_id'],
    },
    {
      name: 'idx_product_sku',
      fields: ['sku_number'],
    },
    {
      name: 'idx_product_name',
      fields: ['item_name'],
    },
    {
      name: 'idx_product_store',
      fields: ['store_id'],
    },
  ],
})
export class ProductList extends Model {
  @PrimaryKey
  @AutoIncrement
  @Column({
    type: DataType.INTEGER,
    field: 'product_id',
  })
  product_id: number;

  @Column({
    type: DataType.STRING(255),
    allowNull: true,
    field: 'sku_number',
  })
  skuNumber: string;

  @Column({
    type: DataType.STRING,
    allowNull: false,
    field: 'item_name',
  })
  itemName: string;

  @Column({
    type: DataType.STRING,
  })
  image: string;

  @Column({
    type: DataType.STRING,
  })
  category: string;

  @Column({
    type: DataType.STRING,
  })
  brand: string;

  @Column({
    type: DataType.INTEGER,
    allowNull: true,
    defaultValue: null,
  })
  brand_id: number;

  @Column({
    type: DataType.STRING,
  })
  template: string;

  @Column({
    type: DataType.STRING,
  })
  color: string;

  @Column({
    type: DataType.STRING,
  })
  handle: string;

  @Column({
    type: DataType.INTEGER,
    allowNull: false,
    references: {
      model: 'stores',
      key: 'store_id',
    },
    field: 'store_id',
  })
  storeId: number;

  @Column({
    type: DataType.BOOLEAN,
    defaultValue: false,
    field: 'is_store_only',
  })
  isStoreOnly: boolean;

  @Column({
    type: DataType.INTEGER,
  })
  stock: number;

  @Column({
    type: DataType.INTEGER,
  })
  sold: number;

  @Column({
    type: DataType.INTEGER,
    field: 'need_approval',
  })
  needApproval: number;

  @Column({
    type: DataType.STRING,
  })
  description: string;

  @Column({
    type: DataType.STRING,
  })
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

  // Association properties (defined in packageASSOCIATION.ts)
  declare tags?: TagSource[];
  declare brandData?: Brands;
  declare variants?: Variant[];

  @BeforeSave
  static beforeSaveHook(product: ProductList): void {
    if (product.handle) {
      product.handle = product.handle
        .replace(/[^a-zA-Z0-9\s]/g, '')
        .replace(/\s+/g, '-')
        .toLowerCase();
    }

    if (product.skuNumber) {
      product.skuNumber = product.skuNumber.trim();
    }
  }
}
