import { Table, Column, Model, DataType, BelongsTo, ForeignKey } from 'sequelize-typescript';
import { ConsumerProductList } from './consumer-product-list.entity';

@Table({
  tableName: 'customer_inventory',
  timestamps: true,
})
export class ConsumerInventory extends Model {
  @Column({
    type: DataType.INTEGER,
    autoIncrement: true,
    primaryKey: true,
  })
  declare id: number;

  @Column({
    type: DataType.INTEGER,
    field: 'package_id',
  })
  packageId: number;

  @Column({
    type: DataType.INTEGER,
    field: 'consumer_id',
  })
  consumerId: number;

  @Column({
    type: DataType.STRING,
    allowNull: false,
    field: 'sku_number',
  })
  skuNumber: string;

  @ForeignKey(() => ConsumerProductList)
  @Column({
    type: DataType.INTEGER,
    field: 'product_id',
  })
  productId: number;

  @BelongsTo(() => ConsumerProductList)
  product: ConsumerProductList;

  @Column(DataType.STRING)
  size: string;

  @Column(DataType.STRING)
  type: string;

  @Column(DataType.STRING)
  location: string;

  @Column(DataType.INTEGER)
  price: number;

  @Column(DataType.STRING)
  status: string;

  @Column({
    type: DataType.DATE,
    field: 'accepted_on',
  })
  acceptedOn: Date;
}
