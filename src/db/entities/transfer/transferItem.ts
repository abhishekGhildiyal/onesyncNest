import {
  AutoIncrement,
  Column,
  DataType,
  Model,
  PrimaryKey,
  Table,
} from 'sequelize-typescript';

@Table({
  tableName: 'transfer_item',
  timestamps: false,
})
export class TransferItem extends Model {
  @PrimaryKey
  @AutoIncrement
  @Column(DataType.BIGINT)
  declare id: number;

  @Column({ type: DataType.INTEGER, field: 'inventory_id' })
  declare inventoryId: number;

  @Column(DataType.STRING)
  declare status: string;
}
