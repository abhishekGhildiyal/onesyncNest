import {
  AutoIncrement,
  Column,
  DataType,
  Model,
  PrimaryKey,
  Table,
} from 'sequelize-typescript';
import { PackageOrder } from './packageOrder';

@Table({
  timestamps: true,
})
export class PackagePayment extends Model {
  @PrimaryKey
  @AutoIncrement
  @Column({
    type: DataType.INTEGER,
  })
  declare id: number;

  @Column({
    type: DataType.INTEGER,
    allowNull: false,
    references: {
      model: 'PackageOrders',
      key: 'id',
    },
    onDelete: 'CASCADE',
  })
  declare package_id: number;

  @Column({
    type: DataType.STRING,
    allowNull: true,
  })
  declare payment_method: string;

  @Column({
    type: DataType.DATE,
    allowNull: true,
  })
  declare payment_date: Date;

  @Column({
    type: DataType.DOUBLE,
    allowNull: true,
  })
  declare total_amount: number;

  @Column({
    type: DataType.DOUBLE,
    allowNull: true,
  })
  declare received_amount: number;

  // Association properties (defined in packageASSOCIATION.ts)
  declare order?: PackageOrder;
}
