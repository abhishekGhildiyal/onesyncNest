import { Column, DataType, Model, PrimaryKey, Table } from 'sequelize-typescript';

@Table({
  tableName: 'revinfo',
  timestamps: false,
})
export class Revinfo extends Model {
  @PrimaryKey
  @Column(DataType.INTEGER)
  declare id: number;

  @Column(DataType.BIGINT)
  declare timestamp: number;

  @Column(DataType.STRING)
  declare username: string;
}
