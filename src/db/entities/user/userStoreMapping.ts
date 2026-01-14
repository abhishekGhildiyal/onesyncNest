import {
  AutoIncrement,
  Column,
  DataType,
  Model,
  PrimaryKey,
  Table,
} from 'sequelize-typescript';
import { Role } from '../permission/role';
import { Store } from '../store/store';
import { User } from './user';

@Table({
  tableName: 'user_store_role',
  timestamps: false,
})
export class UserStoreMapping extends Model {
  @PrimaryKey
  @AutoIncrement
  @Column({
    type: DataType.INTEGER,
    field: 'id',
  })
  declare id: number;

  @Column({
    type: DataType.INTEGER,
    field: 'user_id',
  })
  declare userId: number;

  @Column({
    type: DataType.INTEGER,
    field: 'store_id',
  })
  declare storeId: number;

  @Column({
    type: DataType.INTEGER,
    field: 'role_id',
  })
  declare roleId: number;

  @Column({
    type: DataType.INTEGER,
    field: 'role_status',
  })
  declare status: number;

  @Column({
    type: DataType.FLOAT,
    field: 'user_fee',
  })
  declare fee: number;

  @Column({
    type: DataType.STRING,
    field: 'user_time_zone',
  })
  declare userTimeZone: string;

  @Column({
    type: DataType.BIGINT,
  })
  declare favourite_store_location_id: number;

  @Column({
    type: DataType.BOOLEAN,
    allowNull: true,
    defaultValue: false,
  })
  declare is_sales_agent: boolean;

  @Column({
    type: DataType.BOOLEAN,
    allowNull: true,
    defaultValue: false,
  })
  declare is_logistic_agent: boolean;

  // Association properties (defined in userASSOCIATION.ts)
  declare user?: User;
  declare role?: Role;
  declare store?: Store;
}
