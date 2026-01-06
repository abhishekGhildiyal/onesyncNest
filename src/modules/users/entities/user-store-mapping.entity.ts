import {
  AutoIncrement,
  BelongsTo,
  Column,
  DataType,
  ForeignKey,
  Model,
  PrimaryKey,
  Table,
} from 'sequelize-typescript';
import { Role } from './role.entity';
import { Store } from './store.entity';
import { User } from './user.entity';

@Table({
  tableName: 'user_store_role',
  timestamps: false,
})
export class UserStoreMapping extends Model {
  @PrimaryKey
  @AutoIncrement
  @Column(DataType.INTEGER)
  declare id: number;

  @ForeignKey(() => User)
  @Column({
    type: DataType.INTEGER,
    field: 'user_id',
  })
  declare userId: number;

  @BelongsTo(() => User)
  declare user: User;

  @ForeignKey(() => Store)
  @Column({
    type: DataType.INTEGER,
    field: 'store_id',
  })
  declare storeId: number;

  @BelongsTo(() => Store)
  declare store: Store;

  @ForeignKey(() => Role)
  @Column({
    type: DataType.INTEGER,
    field: 'role_id',
  })
  declare roleId: number;

  @BelongsTo(() => Role)
  declare role: Role;

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

  @Column(DataType.BIGINT)
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
}
