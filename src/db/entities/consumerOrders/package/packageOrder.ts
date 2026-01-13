import {
  AutoIncrement,
  Column,
  DataType,
  Model,
  PrimaryKey,
  Table,
} from 'sequelize-typescript';
import { PACKAGE_STATUS, PAYMENT_STATUS } from 'src/common/constants/enum';

@Table({
  timestamps: true,
})
export class PackageOrder extends Model<PackageOrder> {
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
    defaultValue: PACKAGE_STATUS.CREATED,
    allowNull: false,
  })
  status: string;

  @Column({
    type: DataType.ENUM(...Object.values(PAYMENT_STATUS)),
    defaultValue: PAYMENT_STATUS.PENDING,
    allowNull: false,
  })
  paymentStatus: string;

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

  // employee_id = is_logistic_agent
  @Column({
    type: DataType.INTEGER,
    allowNull: true,
  })
  employee_id: number;

  @Column({
    type: DataType.STRING,
    allowNull: true,
  })
  notes: string;

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
  sales_agent_id: number;
}
