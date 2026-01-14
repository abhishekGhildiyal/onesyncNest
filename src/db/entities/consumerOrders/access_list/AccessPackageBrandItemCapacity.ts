import {
  AutoIncrement,
  Column,
  DataType,
  Model,
  PrimaryKey,
  Table,
} from 'sequelize-typescript';

@Table({
  timestamps: true,
})
export class AccessPackageBrandItemsCapacity extends Model {
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
  item_id: number;

  @Column({
    type: DataType.INTEGER,
    allowNull: false,
  })
  variant_id: number;

  @Column({
    type: DataType.INTEGER,
    allowNull: true,
  })
  maxCapacity: number;

  @Column({
    type: DataType.INTEGER,
    allowNull: true,
  })
  selectedCapacity: number;
}
