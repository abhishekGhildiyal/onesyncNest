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
export class AccessPackageBrand extends Model {
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
      model: 'AccessPackageOrders',
      key: 'id',
    },
    onDelete: 'CASCADE',
  })
  declare package_id: number;

  @Column({
    type: DataType.INTEGER,
    allowNull: false,
  })
  declare brand_id: number;

  @Column({
    type: DataType.BOOLEAN,
    allowNull: true,
    defaultValue: false,
  })
  declare selected: boolean;
}
