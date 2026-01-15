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
  declare inventory_id: number;

  @Column({ type: DataType.INTEGER, allowNull: true })
  declare product_id: number;

  @Column({ type: DataType.INTEGER, allowNull: true })
  declare variant_id: number;

  @Column({ type: DataType.INTEGER, allowNull: true })
  declare item_id: number;

  @Column({ type: DataType.INTEGER, allowNull: true })
  declare store_id: number;

  @Column({ type: DataType.STRING(255), allowNull: true })
  declare status: string;

  @Column({ type: DataType.STRING(255), allowNull: true })
  declare owner: string;

  @Column({ type: DataType.STRING(255), allowNull: true })
  declare product_name: string;

  @Column({ type: DataType.STRING(255), allowNull: true })
  declare sku: string;

  @Column({ type: DataType.STRING(255), allowNull: true })
  declare barcode: string;

  @Column({ type: DataType.STRING(255), allowNull: true })
  declare box_condition: string;

  @Column({ type: DataType.STRING(255), allowNull: true })
  declare item_condition: string;

  @Column({ type: DataType.STRING(255), allowNull: true })
  declare product_type: string;

  @Column({ type: DataType.STRING(255), allowNull: true })
  declare size: string;

  @Column({ type: DataType.DOUBLE, allowNull: true })
  declare price: number;

  @Column({ type: DataType.DATE(6), allowNull: true })
  declare requested_on: Date;

  @Column({ type: DataType.DATE(6), allowNull: true })
  declare approved_on: Date;

  @Column({ type: DataType.DATE(6), allowNull: true })
  declare accepted_on: Date;

  @Column({ type: DataType.DATE(6), allowNull: true })
  declare status_updated_on: Date;

  @Column({ type: DataType.STRING(255), allowNull: true })
  declare updating_user: string;
}
