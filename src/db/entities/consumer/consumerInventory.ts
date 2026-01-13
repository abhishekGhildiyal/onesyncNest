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
export class ConsumerInventory extends Model<ConsumerInventory> {
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

  @Column({
    type: DataType.INTEGER,
    field: 'product_id',
  })
  productId: number;

  @Column({
    type: DataType.STRING,
  })
  size: string;

  @Column({
    type: DataType.STRING,
  })
  type: string;

  @Column({
    type: DataType.STRING,
  })
  location: string;

  @Column({
    type: DataType.INTEGER,
  })
  price: number;

  @Column({
    type: DataType.STRING,
  })
  status: string;

  @Column({
    type: DataType.DATE,
    field: 'accepted_on',
  })
  acceptedOn: Date;
}
