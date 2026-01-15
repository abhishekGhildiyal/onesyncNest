import {
  AutoIncrement,
  Column,
  DataType,
  Model,
  PrimaryKey,
  Table,
} from 'sequelize-typescript';
import { BRAND_STATUS, BRAND_TYPE } from 'src/common/constants/enum';

@Table({
  tableName: 'brands',
  freezeTableName: true,
  timestamps: true,
  createdAt: 'created_at',
  updatedAt: 'updated_at',
})
export class Brands extends Model {
  @PrimaryKey
  @AutoIncrement
  @Column({
    type: DataType.INTEGER,
  })
  declare id: number;

  @Column({
    type: DataType.STRING,
    allowNull: false,
    field: 'brand_name',
  })
  declare brandName: string;

  @Column({
    type: DataType.ENUM(...Object.values(BRAND_STATUS)),
    allowNull: false,
  })
  declare status: string;

  @Column({
    type: DataType.ENUM(...Object.values(BRAND_TYPE)),
    allowNull: false,
  })
  declare type: string;

  @Column({
    type: DataType.INTEGER,
    allowNull: true,
    references: {
      model: 'stores',
      key: 'store_id',
    },
  })
  declare store_id: number;
}
