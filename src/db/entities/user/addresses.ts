import {
  AutoIncrement,
  Column,
  DataType,
  Model,
  PrimaryKey,
  Table,
} from 'sequelize-typescript';

@Table({
  tableName: 'addresses',
  timestamps: true,
  createdAt: 'created_at',
  updatedAt: 'updated_at',
})
export class Addresses extends Model {
  @PrimaryKey
  @AutoIncrement
  @Column({
    type: DataType.BIGINT,
    field: 'address_id',
  })
  declare id: number;

  @Column({ type: DataType.STRING(255), allowNull: false })
  declare address: string;

  @Column({ type: DataType.STRING(255), allowNull: false })
  declare city: string;

  @Column({ type: DataType.STRING(255), allowNull: false })
  declare country: string;

  @Column({ type: DataType.STRING(255), allowNull: false, field: 'label_name' })
  declare label_name: string;

  @Column({ type: DataType.STRING(255), allowNull: true })
  declare state: string;

  @Column({ type: DataType.STRING(255), allowNull: false, field: 'zip_code' })
  declare zip_code: string;

  @Column({ type: DataType.INTEGER, allowNull: true, field: 'customer_id' })
  declare customer_id: number;

  @Column({ type: DataType.STRING(255), allowNull: false, field: 'phone_number' })
  declare phone_number: string;

  @Column({ type: DataType.STRING(255), allowNull: true })
  declare apartment: string;

  @Column({ type: DataType.STRING(255), allowNull: true, field: 'first_name' })
  declare first_name: string;

  @Column({ type: DataType.STRING(255), allowNull: true, field: 'last_name' })
  declare last_name: string;
}
