import {
  AutoIncrement,
  BeforeSave,
  Column,
  DataType,
  Model,
  PrimaryKey,
  Table,
  Unique,
} from 'sequelize-typescript';

@Table({
  timestamps: true,
})
export class ConsumerProductList extends Model<ConsumerProductList> {
  @PrimaryKey
  @AutoIncrement
  @Column({
    type: DataType.INTEGER,
    field: 'product_id',
  })
  product_id: number;

  @Unique
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
    allowNull: true,
  })
  image: string;

  @Column({
    type: DataType.STRING,
    allowNull: true,
  })
  category: string;

  @Column({
    type: DataType.STRING,
    allowNull: true,
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
    allowNull: true,
  })
  template: string;

  @Column({
    type: DataType.STRING,
    allowNull: true,
  })
  color: string;

  @Column({
    type: DataType.STRING,
    allowNull: true,
  })
  handle: string;

  @Column({
    type: DataType.STRING,
    allowNull: true,
  })
  description: string;

  @Column({
    type: DataType.STRING,
    allowNull: true,
  })
  type: string;

  @BeforeSave
  static beforeSaveHook(product: ConsumerProductList): void {
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
