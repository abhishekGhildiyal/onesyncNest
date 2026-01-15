import {
  AutoIncrement,
  Column,
  DataType,
  Model,
  PrimaryKey,
  Table,
} from 'sequelize-typescript';
import { ProductList } from '../product/productList';

@Table({
  tableName: 'tag_source',
  freezeTableName: true,
  timestamps: false,
})
export class TagSource extends Model {
  @PrimaryKey
  @AutoIncrement
  @Column({
    type: DataType.INTEGER,
  })
  declare id: number;

  @Column({
    type: DataType.STRING,
  })
  declare input: string;

  @Column({
    type: DataType.BOOLEAN,
  })
  declare pos: boolean;

  @Column({
    type: DataType.BOOLEAN,
  })
  declare web: boolean;

  // Association properties (defined in packageASSOCIATION.ts)
  declare products?: ProductList[];
}
