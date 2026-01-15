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
  indexes: [
    {
      unique: true,
      name: 'consumer_label_unique',
      fields: ['consumer_id', 'label'],
    },
  ],
})
export class ConsumerShippingAddress extends Model {
  @PrimaryKey
  @AutoIncrement
  @Column({
    type: DataType.INTEGER,
    field: 'id',
  })
  declare id: number;

  @Column({
    type: DataType.STRING,
    allowNull: true,
  })
  declare label: string;

  @Column({
    type: DataType.INTEGER,
    field: 'consumer_id',
    allowNull: false,
  })
  declare consumerId: number;

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
  declare country: string;

  @Column({
    type: DataType.STRING,
  })
  declare city: string;

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
    allowNull: false,
    defaultValue: false,
  })
  declare selected: boolean;

  @Column({
    type: DataType.BOOLEAN,
    field: 'same_address',
    allowNull: false,
    defaultValue: false,
  })
  declare sameAddress: boolean;
}
