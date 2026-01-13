import {
  AutoIncrement,
  Column,
  DataType,
  Model,
  PrimaryKey,
  Table,
} from 'sequelize-typescript';

@Table({
  tableName: 'withdrawn_request',
  timestamps: false,
  underscored: true,
})
export class WithdrawnRequest extends Model {
  @PrimaryKey
  @AutoIncrement
  @Column({ type: DataType.BIGINT })
  declare id: number;

  @Column({ type: DataType.INTEGER, allowNull: true })
  inventory_id: number;

  @Column({ type: DataType.INTEGER, allowNull: true })
  product_id: number;

  @Column({ type: DataType.INTEGER, allowNull: true })
  variant_id: number;

  @Column({ type: DataType.INTEGER, allowNull: true })
  item_id: number;

  @Column({ type: DataType.INTEGER, allowNull: true })
  store_id: number;

  @Column({ type: DataType.STRING(255), allowNull: true })
  status: string;

  @Column({ type: DataType.STRING(255), allowNull: true })
  owner: string;

  @Column({ type: DataType.STRING(255), allowNull: true })
  product_name: string;

  @Column({ type: DataType.STRING(255), allowNull: true })
  sku: string;

  @Column({ type: DataType.STRING(255), allowNull: true })
  barcode: string;

  @Column({ type: DataType.STRING(255), allowNull: true })
  box_condition: string;

  @Column({ type: DataType.STRING(255), allowNull: true })
  item_condition: string;

  @Column({ type: DataType.STRING(255), allowNull: true })
  product_type: string;

  @Column({ type: DataType.STRING(255), allowNull: true })
  size: string;

  @Column({ type: DataType.DOUBLE, allowNull: true })
  price: number;

  @Column({ type: DataType.DATE(6), allowNull: true })
  requested_on: Date;

  @Column({ type: DataType.DATE(6), allowNull: true })
  approved_on: Date;

  @Column({ type: DataType.DATE(6), allowNull: true })
  accepted_on: Date;

  @Column({ type: DataType.DATE(6), allowNull: true })
  status_updated_on: Date;

  @Column({ type: DataType.STRING(255), allowNull: true })
  updating_user: string;
}
