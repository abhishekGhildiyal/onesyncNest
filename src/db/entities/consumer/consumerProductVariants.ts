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
export class ConsumerProductVariants extends Model<ConsumerProductVariants> {
  @PrimaryKey
  @AutoIncrement
  @Column({
    type: DataType.INTEGER,
  })
  declare id: number;

  @Column({
    type: DataType.STRING,
  })
  size: string;

  @Column({
    type: DataType.DOUBLE,
  })
  price: number;

  @Column({
    type: DataType.STRING,
  })
  note: string;

  @Column({
    type: DataType.DATE,
  })
  purchase_date: Date;

  @Column({
    type: DataType.STRING,
  })
  purchase_order_no: string;

  @Column({
    type: DataType.STRING,
  })
  purchase_from_vendor: string;

  @Column({
    type: DataType.BIGINT,
  })
  package_id: number;

  @Column({
    type: DataType.INTEGER,
  })
  original_quantity: number;

  @Column({
    type: DataType.INTEGER,
  })
  selected_quantity: number;

  @Column({
    type: DataType.INTEGER,
  })
  received_quantity: number;

  @Column({
    type: DataType.INTEGER,
    field: 'product_id',
  })
  productId: number;

  @Column({
    type: DataType.INTEGER,
  })
  user_id: number;
}
