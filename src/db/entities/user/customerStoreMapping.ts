import {
  AutoIncrement,
  Column,
  DataType,
  Model,
  PrimaryKey,
  Table,
} from 'sequelize-typescript';

@Table({
  tableName: 'customer_store_mapping',
  timestamps: false,
})
export class CustomerStoreMapping extends Model {
  @PrimaryKey
  @AutoIncrement
  @Column({ type: DataType.BIGINT })
  declare id: number;

  @Column({ type: DataType.DATE(6), allowNull: true, field: 'added_on' })
  declare added_on: Date;

  @Column({ type: DataType.INTEGER, allowNull: true })
  declare status: number;

  @Column({ type: DataType.INTEGER, allowNull: false, field: 'customer_id' })
  declare customer_id: number;

  @Column({ type: DataType.INTEGER, allowNull: false, field: 'store_id' })
  declare store_id: number;

  @Column({ type: DataType.BIGINT, allowNull: true, field: 'default_address_id' })
  declare default_address_id: number;

  @Column({ type: DataType.BOOLEAN, allowNull: true, field: 'is_email_subscribed' })
  declare is_email_subscribed: boolean;

  @Column({ type: DataType.BOOLEAN, allowNull: true, field: 'is_sms_subscribed' })
  declare is_sms_subscribed: boolean;

  @Column({ type: DataType.STRING(255), allowNull: true })
  declare notes: string;

  @Column({ type: DataType.STRING(255), allowNull: true })
  declare tags: string;

  @Column({ type: DataType.BOOLEAN, allowNull: true })
  declare isEmailSubscribed: boolean;

  @Column({ type: DataType.BOOLEAN, allowNull: true })
  declare isSmsSubscribed: boolean;
}
