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
  label: string;

  @Column({
    type: DataType.INTEGER,
    field: 'consumer_id',
    allowNull: false,
  })
  consumerId: number;

  @Column({
    type: DataType.STRING,
    field: 'user_address',
  })
  address: string;

  @Column({
    type: DataType.STRING,
    field: 'user_address2',
  })
  address2: string;

  @Column({
    type: DataType.STRING,
  })
  country: string;

  @Column({
    type: DataType.STRING,
  })
  city: string;

  @Column({
    type: DataType.STRING,
  })
  state: string;

  @Column({
    type: DataType.STRING,
  })
  zip: string;

  @Column({
    type: DataType.BOOLEAN,
    allowNull: false,
    defaultValue: false,
  })
  selected: boolean;

  @Column({
    type: DataType.BOOLEAN,
    field: 'same_address',
    allowNull: false,
    defaultValue: false,
  })
  sameAddress: boolean;
}
