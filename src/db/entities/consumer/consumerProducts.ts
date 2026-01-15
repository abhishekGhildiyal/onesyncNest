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
export class ConsumerProductList extends Model {
  @PrimaryKey
  @AutoIncrement
  @Column({
    type: DataType.INTEGER,
    field: 'product_id',
  })
  declare product_id: number;

  @Unique
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
    allowNull: true,
  })
  declare image: string;

  @Column({
    type: DataType.STRING,
    allowNull: true,
  })
  declare category: string;

  @Column({
    type: DataType.STRING,
    allowNull: true,
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
    allowNull: true,
  })
  declare template: string;

  @Column({
    type: DataType.STRING,
    allowNull: true,
  })
  declare color: string;

  @Column({
    type: DataType.STRING,
    allowNull: true,
  })
  declare handle: string;

  @Column({
    type: DataType.STRING,
    allowNull: true,
  })
  declare description: string;

  @Column({
    type: DataType.STRING,
    allowNull: true,
  })
  declare type: string;

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
