import { AutoIncrement, Column, DataType, Model, PrimaryKey, Table } from 'sequelize-typescript';

@Table({
  timestamps: true,
})
export class ConsumerProductVariants extends Model {
  @PrimaryKey
  @AutoIncrement
  @Column({
    type: DataType.INTEGER,
  })
  declare id: number;

  @Column({
    type: DataType.STRING,
  })
  declare size: string;

  @Column({
    type: DataType.DOUBLE,
  })
  declare price: number;

  @Column({
    type: DataType.STRING,
  })
  declare note: string;

  @Column({
    type: DataType.DATE,
  })
  declare purchase_date: Date;

  @Column({
    type: DataType.STRING,
  })
  declare purchase_order_no: string;

  @Column({
    type: DataType.STRING,
  })
  declare purchase_from_vendor: string;

  @Column({
    type: DataType.BIGINT,
  })
  declare package_id: number;

  @Column({
    type: DataType.INTEGER,
  })
  declare original_quantity: number;

  @Column({
    type: DataType.INTEGER,
  })
  declare selected_quantity: number;

  @Column({
    type: DataType.INTEGER,
  })
  declare received_quantity: number;

  @Column({
    type: DataType.INTEGER,
    field: 'product_id',
  })
  declare product_id: number;

  @Column({
    type: DataType.INTEGER,
  })
  declare user_id: number;
}
