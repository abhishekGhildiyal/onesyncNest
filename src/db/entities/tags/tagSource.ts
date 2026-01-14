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
export class TagSource extends Model<TagSource> {
  @PrimaryKey
  @AutoIncrement
  @Column({
    type: DataType.INTEGER,
  })
  declare id: number;

  @Column({
    type: DataType.STRING,
  })
  input: string;

  @Column({
    type: DataType.BOOLEAN,
  })
  pos: boolean;

  @Column({
    type: DataType.BOOLEAN,
  })
  web: boolean;

  // Association properties (defined in packageASSOCIATION.ts)
  declare products?: ProductList[];
}
