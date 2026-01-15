import {
  AutoIncrement,
  Column,
  DataType,
  Model,
  PrimaryKey,
  Table,
} from 'sequelize-typescript';
import { ORDER_ITEMS } from 'src/common/constants/enum';

@Table({
  timestamps: true,
})
export class AccessPackageBrandItems extends Model {
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
  declare product_id: number;

  @Column({
    type: DataType.INTEGER,
    allowNull: false,
    references: {
      model: 'AccessPackageBrands',
      key: 'id',
    },
    onDelete: 'CASCADE',
  })
  declare packageBrand_id: number;

  @Column({
    type: DataType.DOUBLE,
    allowNull: true,
  })
  declare price: number;

  @Column({
    type: DataType.INTEGER,
    allowNull: true,
  })
  declare quantity: number;

  @Column({
    type: DataType.INTEGER,
    allowNull: true,
  })
  declare consumerDemand: number;

  @Column({
    type: DataType.ENUM(...Object.values(ORDER_ITEMS)),
    defaultValue: null,
    allowNull: true,
  })
  declare isItemReceived: string;
}
