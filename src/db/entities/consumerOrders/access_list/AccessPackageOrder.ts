import {
  AutoIncrement,
  Column,
  DataType,
  Model,
  PrimaryKey,
  Table,
  Unique,
} from 'sequelize-typescript';
import { PACKAGE_STATUS } from 'src/common/constants/enum';

@Table({
  timestamps: true,
})
export class AccessPackageOrder extends Model {
  @PrimaryKey
  @AutoIncrement
  @Column({
    type: DataType.INTEGER,
  })
  declare id: number;

  @Unique
  @Column({
    type: DataType.STRING,
    allowNull: false,
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
    defaultValue: PACKAGE_STATUS.ACCESS,
    allowNull: false,
  })
  declare status: string;

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
}
