import { Table, Column, Model, DataType, PrimaryKey, AutoIncrement, ForeignKey, BelongsTo, HasMany } from 'sequelize-typescript';
import { User } from '../../users/entities/user.entity';
import { PACKAGE_STATUS, PAYMENT_STATUS } from '../../../common/constants/enum';
import { PackageCustomer } from './package-customer.entity';
import { PackageBrand } from './package-brand.entity';

@Table({
  tableName: 'PackageOrders',
  timestamps: true,
})
export class PackageOrder extends Model {
  @PrimaryKey
  @AutoIncrement
  @Column(DataType.INTEGER)
  declare id: number;

  @Column(DataType.STRING)
  packageName: string;

  @ForeignKey(() => User)
  @Column({
    type: DataType.INTEGER,
    allowNull: false,
  })
  user_id: number;

  @Column({
    type: DataType.STRING,
    allowNull: false,
  })
  order_id: string;

  @Column({
    type: DataType.INTEGER,
    allowNull: false,
  })
  store_id: number;

  @Column({
    type: DataType.ENUM(...Object.values(PACKAGE_STATUS)),
    defaultValue: PACKAGE_STATUS.CREATED,
    allowNull: false,
  })
  status: PACKAGE_STATUS;

  @Column({
    type: DataType.ENUM(...Object.values(PAYMENT_STATUS)),
    defaultValue: PAYMENT_STATUS.PENDING,
    allowNull: false,
  })
  paymentStatus: PAYMENT_STATUS;

  @Column({
    type: DataType.BOOLEAN,
    defaultValue: false,
    allowNull: false,
  })
  shipmentStatus: boolean;

  @Column({
    type: DataType.BOOLEAN,
    defaultValue: false,
  })
  showPrices: boolean;

  @Column({
    type: DataType.DATE,
    defaultValue: null,
  })
  statusChangeDate: Date;

  @Column({
    type: DataType.BOOLEAN,
    defaultValue: false,
    allowNull: false,
  })
  isManualOrder: boolean;

  @Column(DataType.INTEGER)
  employee_id: number;

  @Column(DataType.STRING)
  notes: string;

  @Column(DataType.DOUBLE)
  total_amount: number;

  @Column(DataType.DOUBLE)
  received_amount: number;

  @ForeignKey(() => User)
  @Column(DataType.INTEGER)
  sales_agent_id: number;

  @BelongsTo(() => User, 'sales_agent_id')
  salesAgent: User;

  @HasMany(() => PackageCustomer, {
    foreignKey: 'package_id',
    onDelete: 'CASCADE',
    hooks: true,
  })
  customers: PackageCustomer[];

  @HasMany(() => PackageBrand, {
    foreignKey: 'package_id',
    onDelete: 'CASCADE',
    hooks: true,
  })
  brands: PackageBrand[];
}
