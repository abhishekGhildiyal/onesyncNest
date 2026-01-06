import { Table, Column, Model, DataType, PrimaryKey, AutoIncrement, HasMany, BelongsTo } from 'sequelize-typescript';
import { PACKAGE_STATUS, PAYMENT_STATUS } from '../../../common/constants/enum';
import { AccessPackageBrand } from './access-package-brand.entity';
import { AccessPackageCustomer } from './access-package-customer.entity';
import { Store } from '../../users/entities/store.entity';

@Table({
  tableName: 'AccessPackageOrders',
  timestamps: true,
})
export class AccessPackageOrder extends Model {
  @PrimaryKey
  @AutoIncrement
  @Column(DataType.INTEGER)
  declare id: number;

  @Column({
    type: DataType.STRING,
    allowNull: false,
    unique: true,
  })
  packageName: string;

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
    defaultValue: PACKAGE_STATUS.ACCESS,
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

  @Column(DataType.INTEGER)
  sales_agent_id: number;

  @HasMany(() => AccessPackageBrand, {
    foreignKey: 'package_id',
    onDelete: 'CASCADE',
    hooks: true,
  })
  brands: AccessPackageBrand[];

  @HasMany(() => AccessPackageCustomer, {
    foreignKey: 'package_id',
    onDelete: 'CASCADE',
    hooks: true,
  })
  customers: AccessPackageCustomer[];

  @BelongsTo(() => Store, 'store_id')
  store: Store;
}
