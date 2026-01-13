import {
  AutoIncrement,
  Column,
  DataType,
  Model,
  PrimaryKey,
  Table,
} from 'sequelize-typescript';

@Table({
  timestamps: true,
})
export class ConsumerProductsMapping extends Model<ConsumerProductsMapping> {
  @PrimaryKey
  @AutoIncrement
  @Column({
    type: DataType.INTEGER,
    field: 'id',
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
