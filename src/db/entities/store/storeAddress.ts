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
export class StoreAddress extends Model {
  @PrimaryKey
  @AutoIncrement
  @Column({
    type: DataType.INTEGER,
  })
  declare id: number;

  @Column({
    type: DataType.STRING,
    allowNull: true,
  })
  declare label: string;

  @Column({
    type: DataType.INTEGER,
    allowNull: false,
    field: 'store_id',
  })
  declare storeId: number;

  @Column({
    type: DataType.BOOLEAN,
  })
  declare selected: boolean;

  @Column({
    type: DataType.STRING,
    field: 'user_address',
  })
  declare address: string;

  @Column({
    type: DataType.STRING,
    field: 'user_address2',
  })
  declare address2: string;

  @Column({
    type: DataType.STRING,
  })
  declare city: string;

  @Column({
    type: DataType.STRING,
  })
  declare country: string;

  @Column({
    type: DataType.STRING,
  })
  declare state: string;

  @Column({
    type: DataType.STRING,
  })
  declare zip: string;

  @Column({
    type: DataType.BOOLEAN,
    defaultValue: false,
  })
  declare isBilling: boolean;

  @Column({
    type: DataType.BOOLEAN,
    field: 'same_address',
    allowNull: false,
    defaultValue: false,
  })
  declare sameAddress: boolean;
}
