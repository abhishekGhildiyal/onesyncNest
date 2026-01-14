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
  store_id: number;

  @Column({
    type: DataType.STRING,
    allowNull: false,
  })
  label_name: string;

  @Column({
    type: DataType.ENUM(...Object.values(LABEL_TYPES)),
    allowNull: false,
  })
  template_type: string;

  @Column({
    type: DataType.JSON,
    allowNull: true,
  })
  label_dimension: any;

  @Column({
    type: DataType.JSON,
    allowNull: true,
  })
  label_template: any;

  @Column({
    type: DataType.DATE,
    allowNull: true,
  })
  deleted_at: Date;
}
