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
export class PackageBrandItems extends Model<PackageBrandItems> {
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
  product_id: number;

  @Column({
    type: DataType.INTEGER,
    allowNull: false,
    references: {
      model: 'PackageBrands',
      key: 'id',
    },
    onDelete: 'CASCADE',
  })
  packageBrand_id: number;

  @Column({
    type: DataType.DOUBLE,
    allowNull: true,
  })
  price: number;

  @Column({
    type: DataType.INTEGER,
    allowNull: true,
  })
  quantity: number;

  @Column({
    type: DataType.INTEGER,
    allowNull: true,
  })
  consumerDemand: number;

  @Column({
    type: DataType.ENUM(...Object.values(ORDER_ITEMS)),
    defaultValue: null,
    allowNull: true,
  })
  isItemReceived: string;
}
