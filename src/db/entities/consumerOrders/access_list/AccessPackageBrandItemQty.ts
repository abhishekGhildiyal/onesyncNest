import {
  AutoIncrement,
  Column,
  DataType,
  Model,
  PrimaryKey,
  Table,
} from 'sequelize-typescript';

@Table({
  freezeTableName: true,
  timestamps: true,
})
export class AccessPackageBrandItemsQty extends Model {
  @PrimaryKey
  @AutoIncrement
  @Column({
    type: DataType.INTEGER,
  })
  declare id: number;

  @Column({
    type: DataType.INTEGER,
    allowNull: false,
    references: {
      model: 'AccessPackageBrandItems',
      key: 'id',
    },
    onDelete: 'CASCADE',
  })
  declare item_id: number;

  @Column({
    type: DataType.STRING,
    allowNull: false,
  })
  declare variant_size: string;

  @Column({
    type: DataType.INTEGER,
    allowNull: true,
  })
  declare maxCapacity: number;

  @Column({
    type: DataType.INTEGER,
    allowNull: true,
  })
  declare selectedCapacity: number;

  @Column({
    type: DataType.INTEGER,
    allowNull: true,
  })
  declare shortage: number;

  @Column({
    type: DataType.INTEGER,
    allowNull: true,
  })
  declare receivedQuantity: number;
}
