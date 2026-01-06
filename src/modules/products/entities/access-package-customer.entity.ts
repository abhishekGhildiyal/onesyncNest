import { Table, Column, Model, DataType, PrimaryKey, AutoIncrement, ForeignKey, BelongsTo } from 'sequelize-typescript';
import { AccessPackageOrder } from './access-package-order.entity';
import { User } from '../../users/entities/user.entity';

@Table({
  tableName: 'AccessPackageCustomers',
  timestamps: true,
})
export class AccessPackageCustomer extends Model {
  @PrimaryKey
  @AutoIncrement
  @Column(DataType.INTEGER)
  declare id: number;

  @ForeignKey(() => AccessPackageOrder)
  @Column({
    type: DataType.INTEGER,
    allowNull: false,
  })
  package_id: number;

  @BelongsTo(() => AccessPackageOrder)
  package: AccessPackageOrder;

  @ForeignKey(() => User)
  @Column({
    type: DataType.INTEGER,
    allowNull: false,
  })
  customer_id: number;

  @BelongsTo(() => User, 'customer_id')
  customer: User;
}
