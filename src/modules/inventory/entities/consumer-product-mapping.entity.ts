import { Table, Column, Model, DataType } from 'sequelize-typescript';

@Table({
  tableName: 'consumer_products_mapping',
  timestamps: true,
})
export class ConsumerProductsMapping extends Model {
  @Column({
    type: DataType.INTEGER,
    primaryKey: true,
    autoIncrement: true,
  })
  declare id: number;

  @Column({
    type: DataType.INTEGER,
    field: 'consumer_id',
  })
  consumerId: number;

  @Column({
    type: DataType.INTEGER,
    field: 'product_id',
  })
  productId: number;
}
