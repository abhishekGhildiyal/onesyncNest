import { Table, Column, Model, DataType, PrimaryKey, AutoIncrement, ForeignKey, BelongsTo } from 'sequelize-typescript';
import { PackageOrder } from './package-order.entity';

@Table({
  tableName: 'PackagePayments',
  timestamps: true,
})
export class PackagePayment extends Model {
  @PrimaryKey
  @AutoIncrement
  @Column(DataType.INTEGER)
  declare id: number;

  @ForeignKey(() => PackageOrder)
  @Column({
    type: DataType.INTEGER,
    allowNull: false,
  })
  package_id: number;

  @BelongsTo(() => PackageOrder)
  package: PackageOrder;

  @Column(DataType.STRING)
  payment_method: string;

  @Column(DataType.DATE)
  payment_date: Date;

  @Column(DataType.DOUBLE)
  total_amount: number;

  @Column(DataType.DOUBLE)
  received_amount: number;
}
