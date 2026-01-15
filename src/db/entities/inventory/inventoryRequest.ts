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
  declare sku: string;

  @Index
  @Column({
    type: DataType.STRING,
    allowNull: false,
    field: 'item_id',
  })
  declare itemId: string;

  @Column({
    type: DataType.STRING,
    allowNull: false,
  })
  declare size: string;

  @Column({
    type: DataType.STRING,
    allowNull: true,
  })
  declare location: string;

  @Column({
    type: DataType.STRING,
    allowNull: true,
    field: 'requesting_user',
  })
  declare requestingUser: string;

  @Column({
    type: DataType.STRING,
    allowNull: true,
    field: 'item_name',
  })
  declare itemName: string;

  @Column({
    type: DataType.INTEGER,
    allowNull: true,
    field: 'store_id',
  })
  declare storeId: number;

  @Column({
    type: DataType.DATE,
    allowNull: false,
    field: 'requested_time',
  })
  declare requestedTime: Date;

  @Column({
    type: DataType.STRING,
    allowNull: false,
  })
  declare status: string;

  @Column({
    type: DataType.DATE,
    allowNull: true,
    field: 'status_update_time',
  })
  declare statusUpdateTime: Date;

  @Column({
    type: DataType.STRING,
    allowNull: true,
    field: 'updating_user',
  })
  declare updatingUser: string;
}
