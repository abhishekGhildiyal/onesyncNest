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
  tableName: 'calllog',
  timestamps: false,
})
export class CallLog extends Model<CallLog> {
  @PrimaryKey
  @AutoIncrement
  @Index({ unique: true, name: 'id_unique' })
  @Column({
    type: DataType.INTEGER,
  })
  declare id: number;

  @Column({
    type: DataType.STRING,
    allowNull: true,
    field: 'request_url',
  })
  requestUrl: string;

  @Column({
    type: DataType.STRING,
    allowNull: true,
    field: 'request_method',
  })
  requestMethod: string;

  @Column({
    type: DataType.TEXT,
    allowNull: true,
    field: 'request_body',
  })
  requestBody: string;

  @Column({
    type: DataType.STRING,
    allowNull: true,
    field: 'response_status',
  })
  responseStatus: string;

  @Column({
    type: DataType.TEXT,
    allowNull: true,
    field: 'response_body',
  })
  responseBody: string;

  @Column({
    type: DataType.DATE,
    allowNull: true,
    field: 'timestamp',
  })
  timestamp: Date;
}
