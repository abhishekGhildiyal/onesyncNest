import { Column, DataType, Model, Table } from 'sequelize-typescript';

@Table({
  tableName: 'recipient_details',
  timestamps: false,
})
export class RecipientDetails extends Model {
  @Column({
    type: DataType.STRING,
    allowNull: true,
  })
  declare recipientName: string;

  @Column({
    type: DataType.STRING,
    allowNull: true,
  })
  declare recipientEmail: string;

  @Column({
    type: DataType.DOUBLE,
    allowNull: true,
  })
  declare amount: number;

  @Column({
    type: DataType.STRING,
    allowNull: true,
  })
  declare variantId: string;

  @Column({
    type: DataType.INTEGER,
    allowNull: true,
  })
  declare userId: number;

  @Column({
    type: DataType.STRING,
    allowNull: true,
  })
  declare status: string;

  @Column({
    type: DataType.STRING,
    allowNull: true,
  })
  declare itemName: string;

  @Column({
    type: DataType.INTEGER,
    allowNull: true,
  })
  declare productId: number;

  @Column({
    type: DataType.BIGINT,
    allowNull: true,
  })
  declare itemId: number;

  @Column({
    type: DataType.DATE,
    allowNull: true,
  })
  declare soldDate: Date;

  @Column({
    type: DataType.STRING,
    allowNull: true,
  })
  declare memo: string;
}
