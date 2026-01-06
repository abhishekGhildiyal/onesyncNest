import { Table, Column, Model, DataType, Index, BeforeSave, HasMany } from 'sequelize-typescript';
import { ConsumerProductVariant } from './consumer-product-variant.entity';
import { ConsumerInventory } from './consumer-inventory.entity';

@Table({
  tableName: 'consumer_product_list',
  timestamps: true,
})
export class ConsumerProductList extends Model {
  @Column({
    type: DataType.INTEGER,
    autoIncrement: true,
    primaryKey: true,
    field: 'product_id',
  })
  productId: number;

  @Index({ unique: true })
  @Column({
    type: DataType.STRING(255),
    allowNull: true,
    unique: true,
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
  brandId: number;

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

  @HasMany(() => ConsumerProductVariant, {
    foreignKey: 'product_id',
    onDelete: 'CASCADE',
    hooks: true,
  })
  variants: ConsumerProductVariant[];

  @HasMany(() => ConsumerInventory, {
    foreignKey: 'product_id',
    onDelete: 'CASCADE',
    hooks: true,
  })
  inventoryItems: ConsumerInventory[];

  @BeforeSave
  static slugify(instance: ConsumerProductList) {
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
