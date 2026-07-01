import {
  AutoIncrement,
  Column,
  DataType,
  Model,
  PrimaryKey,
  Table,
} from 'sequelize-typescript';

@Table({
  tableName: 'audit_item',
  timestamps: false,
})
export class AuditItem extends Model {
  @PrimaryKey
  @AutoIncrement
  @Column(DataType.BIGINT)
  declare id: number;

  @Column({ type: DataType.INTEGER, field: 'inventory_id' })
  declare inventoryId: number;

  @Column({ type: DataType.BOOLEAN, defaultValue: false })
  declare scanned: boolean;

  @Column({ type: DataType.STRING, field: 'inventory_status' })
  declare inventoryStatus: string;

  @Column({ type: DataType.BIGINT, field: 'audit_session_id' })
  declare auditSessionId: number;

  @Column({ type: DataType.DATE, field: 'updated_at' })
  declare updatedAt: Date;
}
