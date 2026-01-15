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
export class ConsumerInventory extends Model {
  @PrimaryKey
  @AutoIncrement
  @Column({
    type: DataType.INTEGER,
  })
  declare id: number;

  @Column({
    type: DataType.INTEGER,
    field: 'package_id',
  })
  declare packageId: number;

  @Column({
    type: DataType.INTEGER,
    field: 'consumer_id',
  })
  declare consumerId: number;

  @Column({
    type: DataType.STRING,
    allowNull: false,
    field: 'sku_number',
  })
  declare skuNumber: string;

  @Column({
    type: DataType.INTEGER,
    field: 'product_id',
  })
  declare productId: number;

  @Column({
    type: DataType.STRING,
  })
  declare size: string;

  @Column({
    type: DataType.STRING,
  })
  declare type: string;

  @Column({
    type: DataType.STRING,
  })
  declare location: string;

  @Column({
    type: DataType.INTEGER,
  })
  declare price: number;

  @Column({
    type: DataType.STRING,
  })
  declare status: string;

  @Column({
    type: DataType.DATE,
    field: 'accepted_on',
  })
  declare acceptedOn: Date;
}
