import { AutoIncrement, Column, DataType, Model, PrimaryKey, Table } from 'sequelize-typescript';

@Table({
  tableName: 'store_tag_source',
  timestamps: false,
})
export class StoreTagSource extends Model {
  @PrimaryKey
  @AutoIncrement
  @Column(DataType.INTEGER)
  declare id: number;

  @Column(DataType.STRING)
  declare name: string;

  @Column(DataType.BOOLEAN)
  declare pos: boolean;

  @Column(DataType.BOOLEAN)
  declare web: boolean;
}
