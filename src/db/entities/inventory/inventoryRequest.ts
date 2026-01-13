import {
  AutoIncrement,
  Column,
  DataType,
  Index,
  Model,
  PrimaryKey,
  Table,
} from 'sequelize-typescript';

@Table({
  tableName: 'inventory_request',
  timestamps: false,
})
export class InventoryRequest extends Model {
  @PrimaryKey
  @AutoIncrement
  @Column({
    type: DataType.BIGINT,
  })
  declare id: number;

  @Column({
    type: DataType.STRING,
    allowNull: false,
  })
  sku: string;

  @Index
  @Column({
    type: DataType.STRING,
    allowNull: false,
    field: 'item_id',
  })
  itemId: string;

  @Column({
    type: DataType.STRING,
    allowNull: false,
  })
  size: string;

  @Column({
    type: DataType.STRING,
    allowNull: true,
  })
  location: string;

  @Column({
    type: DataType.STRING,
    allowNull: true,
    field: 'requesting_user',
  })
  requestingUser: string;

  @Column({
    type: DataType.STRING,
    allowNull: true,
    field: 'item_name',
  })
  itemName: string;

  @Column({
    type: DataType.INTEGER,
    allowNull: true,
    field: 'store_id',
  })
  storeId: number;

  @Column({
    type: DataType.DATE,
    allowNull: false,
    field: 'requested_time',
  })
  requestedTime: Date;

  @Column({
    type: DataType.STRING,
    allowNull: false,
  })
  status: string;

  @Column({
    type: DataType.DATE,
    allowNull: true,
    field: 'status_update_time',
  })
  statusUpdateTime: Date;

  @Column({
    type: DataType.STRING,
    allowNull: true,
    field: 'updating_user',
  })
  updatingUser: string;
}
