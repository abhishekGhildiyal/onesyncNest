import {
  AutoIncrement,
  Column,
  DataType,
  Model,
  PrimaryKey,
  Table,
} from 'sequelize-typescript';

@Table({
  tableName: 'audit_session',
  timestamps: false,
})
export class AuditSession extends Model {
  @PrimaryKey
  @AutoIncrement
  @Column(DataType.BIGINT)
  declare id: number;

  @Column({ type: DataType.STRING, field: 'audit_name' })
  declare auditName: string;

  @Column(DataType.STRING)
  declare status: string;

  @Column({ type: DataType.INTEGER, field: 'user_id' })
  declare userId: number;

  @Column({ type: DataType.INTEGER, field: 'store_id' })
  declare storeId: number;
}
