import {
  AutoIncrement,
  Column,
  DataType,
  Model,
  PrimaryKey,
  Table,
} from 'sequelize-typescript';
import { LABEL_TYPES } from 'src/common/constants/enum';

@Table({
  timestamps: true,
  createdAt: 'created_at',
  updatedAt: 'updated_at',
})
export class Label extends Model {
  @PrimaryKey
  @AutoIncrement
  @Column({
    type: DataType.INTEGER,
  })
  declare id: number;

  @Column({
    type: DataType.INTEGER,
    allowNull: false,
  })
  declare store_id: number;

  @Column({
    type: DataType.STRING,
    allowNull: false,
  })
  declare label_name: string;

  @Column({
    type: DataType.ENUM(...Object.values(LABEL_TYPES)),
    allowNull: false,
  })
  declare template_type: string;

  @Column({
    type: DataType.JSON,
    allowNull: true,
  })
  declare label_dimension: any;

  @Column({
    type: DataType.JSON,
    allowNull: true,
  })
  declare label_template: any;

  @Column({
    type: DataType.DATE,
    allowNull: true,
  })
  declare deleted_at: Date;
}
