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
  declare product_id: number;

  @Column({
    type: DataType.STRING(255),
    allowNull: true,
    field: 'sku_number',
  })
  declare skuNumber: string;

  @Column({
    type: DataType.STRING,
    allowNull: false,
    field: 'item_name',
  })
  declare itemName: string;

  @Column({
    type: DataType.STRING,
  })
  declare image: string;

  @Column({
    type: DataType.STRING,
  })
  declare category: string;

  @Column({
    type: DataType.STRING,
  })
  declare brand: string;

  @Column({
    type: DataType.INTEGER,
    allowNull: true,
    defaultValue: null,
  })
  declare brand_id: number;

  @Column({
    type: DataType.STRING,
  })
  declare template: string;

  @Column({
    type: DataType.STRING,
  })
  declare color: string;

  @Column({
    type: DataType.STRING,
  })
  declare handle: string;

  @Column({
    type: DataType.INTEGER,
    allowNull: false,
    references: {
      model: 'stores',
      key: 'store_id',
    },
    field: 'store_id',
  })
  declare storeId: number;

  @Column({
    type: DataType.BOOLEAN,
    defaultValue: false,
    field: 'is_store_only',
  })
  declare isStoreOnly: boolean;

  @Column({
    type: DataType.INTEGER,
  })
  declare stock: number;

  @Column({
    type: DataType.INTEGER,
  })
  declare sold: number;

  @Column({
    type: DataType.INTEGER,
    field: 'need_approval',
  })
  declare needApproval: number;

  @Column({
    type: DataType.STRING,
  })
  declare description: string;

  @Column({
    type: DataType.STRING,
  })
  declare type: string;

  @Column({
    type: DataType.STRING,
    field: 'stockxstyle_id',
  })
  declare stockXStyleId: string;

  @Column({
    type: DataType.STRING,
    field: 'stockxsize_chart',
  })
  declare stockXSizeChart: string;

  @Column({
    type: DataType.DATE,
    field: 'created_by',
    defaultValue: DataType.NOW,
  })
  declare createdBy: Date;

  @Column({
    type: DataType.DATE,
    field: 'updated_by',
    defaultValue: DataType.NOW,
  })
  declare updatedBy: Date;

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
