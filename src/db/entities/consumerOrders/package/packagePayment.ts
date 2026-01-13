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
export class PackagePayment extends Model<PackagePayment> {
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
  package_id: number;

  @Column({
    type: DataType.STRING,
    allowNull: true,
  })
  payment_method: string;

  @Column({
    type: DataType.DATE,
    allowNull: true,
  })
  payment_date: Date;

  @Column({
    type: DataType.DOUBLE,
    allowNull: true,
  })
  total_amount: number;

  @Column({
    type: DataType.DOUBLE,
    allowNull: true,
  })
  received_amount: number;
}
