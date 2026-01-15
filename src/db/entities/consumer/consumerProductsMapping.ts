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
export class ConsumerProductsMapping extends Model {
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
  declare consumerId: number;

  @Column({
    type: DataType.INTEGER,
    field: 'product_id',
  })
  declare productId: number;
}
