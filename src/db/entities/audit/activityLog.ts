import {
  AutoIncrement,
  Column,
  DataType,
  Model,
  PrimaryKey,
  Table,
} from 'sequelize-typescript';

@Table({
  tableName: 'activity_log',
  timestamps: false,
})
export class ActivityLog extends Model {
  @PrimaryKey
  @AutoIncrement
  @Column(DataType.BIGINT)
  declare id: number;

  @Column({ type: DataType.STRING, field: 'entity_type' })
  declare entityType: string;

  @Column({ type: DataType.BIGINT, field: 'entity_id' })
  declare entityId: number;

  @Column({ type: DataType.INTEGER, field: 'user_id' })
  declare userId: number;

  @Column(DataType.STRING)
  declare action: string;

  @Column(DataType.STRING)
  declare message: string;

  @Column({ type: DataType.BIGINT, field: 'transfer_id', allowNull: true })
  declare transferId: number;

  @Column({ type: DataType.JSON, allowNull: true })
  declare changes: Record<string, unknown>;

  @Column(DataType.DATE)
  declare timestamp: Date;
}
