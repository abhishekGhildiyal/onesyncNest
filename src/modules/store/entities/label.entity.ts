import {
  AutoIncrement,
  BelongsTo,
  Column,
  DataType,
  ForeignKey,
  Model,
  PrimaryKey,
  Table,
} from 'sequelize-typescript';
import { Store } from '../../users/entities';

@Table({
  tableName: 'labels',
  timestamps: true,
  createdAt: 'created_at',
  updatedAt: 'updated_at',
})
export class Label extends Model {
  @PrimaryKey
  @AutoIncrement
  @Column(DataType.INTEGER)
  declare id: number;

  @ForeignKey(() => Store)
  @Column({
    type: DataType.INTEGER,
    allowNull: false,
  })
  declare store_id: number;

  @BelongsTo(() => Store)
  declare store: Store;

  @Column({
    type: DataType.STRING,
    allowNull: false,
  })
  declare label_name: string;

  @Column({
    type: DataType.ENUM('inventory', 'product'),
    allowNull: false,
  })
  declare template_type: string;

  @Column(DataType.JSON)
  declare label_dimension: any;

  @Column(DataType.JSON)
  declare label_template: any;
}
