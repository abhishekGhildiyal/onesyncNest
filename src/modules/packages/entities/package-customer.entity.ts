import { Table, Column, Model, DataType, PrimaryKey, AutoIncrement, ForeignKey, BelongsTo } from 'sequelize-typescript';
import { PackageOrder } from './package-order.entity';
import { User } from '../../users/entities/user.entity';

@Table({
  tableName: 'PackageCustomers',
  timestamps: true,
})
export class PackageCustomer extends Model {
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

  @ForeignKey(() => User)
  @Column({
    type: DataType.INTEGER,
    allowNull: false,
  })
  customer_id: number;

  @BelongsTo(() => User, 'customer_id')
  customer: User;
}
