import {
  AutoIncrement,
  Column,
  DataType,
  Model,
  PrimaryKey,
  Table,
} from 'sequelize-typescript';
import { PACKAGE_STATUS, PAYMENT_STATUS } from 'src/common/constants/enum';
import { Store } from '../../store/store';
import { User } from '../../user/user';
import { PackageBrand } from './packageBrands';
import { PackageCustomer } from './packageCustomers';
import { PackagePayment } from './packagePayment';
import { PackageShipment } from './packageShipment';

@Table({
  timestamps: true,
})
export class PackageOrder extends Model {
  @PrimaryKey
  @AutoIncrement
  @Column({
    type: DataType.INTEGER,
  })
  declare id: number;

  @Column({
    type: DataType.STRING,
    allowNull: true,
  })
  declare packageName: string;

  @Column({
    type: DataType.INTEGER,
    allowNull: false,
  })
  declare user_id: number;

  @Column({
    type: DataType.STRING,
    allowNull: false,
  })
  declare order_id: string;

  @Column({
    type: DataType.INTEGER,
    allowNull: false,
  })
  declare store_id: number;

  @Column({
    type: DataType.ENUM(...Object.values(PACKAGE_STATUS)),
    defaultValue: PACKAGE_STATUS.CREATED,
    allowNull: false,
  })
  declare status: string;

  @Column({
    type: DataType.ENUM(...Object.values(PAYMENT_STATUS)),
    defaultValue: PAYMENT_STATUS.PENDING,
    allowNull: false,
  })
  declare paymentStatus: string;

  @Column({
    type: DataType.BOOLEAN,
    defaultValue: false,
    allowNull: false,
  })
  declare shipmentStatus: boolean;

  @Column({
    type: DataType.BOOLEAN,
    defaultValue: false,
  })
  declare showPrices: boolean;

  @Column({
    type: DataType.DATE,
    defaultValue: null,
  })
  declare statusChangeDate: Date;

  @Column({
    type: DataType.BOOLEAN,
    defaultValue: false,
    allowNull: false,
  })
  declare isManualOrder: boolean;

  // employee_id = is_logistic_agent
  @Column({
    type: DataType.INTEGER,
    allowNull: true,
  })
  declare employee_id: number;

  @Column({
    type: DataType.STRING,
    allowNull: true,
  })
  declare notes: string;

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

  @Column({
    type: DataType.INTEGER,
    allowNull: true,
    references: {
      model: 'users',
      key: 'id',
    },
    onUpdate: 'CASCADE',
    onDelete: 'SET NULL',
  })
  declare sales_agent_id: number;

  // Association properties (defined in packageASSOCIATION.ts)
  declare brands?: PackageBrand[];
  declare store?: Store;
  declare customers?: PackageCustomer[];
  declare user?: User;
  declare shipment?: PackageShipment[];
  declare payment?: PackagePayment[];
  declare employee?: User;
  declare salesAgent?: User;
}
