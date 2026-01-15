import {
  AutoIncrement,
  BelongsTo,
  Column,
  DataType,
  ForeignKey,
  HasMany,
  Model,
  PrimaryKey,
  Table,
} from 'sequelize-typescript';

// ==================== TemplateOption Entity ====================
@Table({
  tableName: 'template_option',
  timestamps: false,
})
export class TemplateOption extends Model {
  @PrimaryKey
  @AutoIncrement
  @Column({
    type: DataType.BIGINT,
  })
  declare id: number;

  @Column({
    type: DataType.STRING,
    allowNull: false,
    field: 'option_key',
  })
  declare key: string;

  @HasMany(() => TemplateOptionValue, {
    foreignKey: 'option_id',
  })
  declare values: TemplateOptionValue[];
}

// ==================== TemplateOptionValue Entity ====================
@Table({
  tableName: 'template_option_values',
  timestamps: false,
})
export class TemplateOptionValue extends Model {
  @PrimaryKey
  @AutoIncrement
  @Column({
    type: DataType.BIGINT,
  })
  declare id: number;

  @ForeignKey(() => TemplateOption)
  @Column({
    type: DataType.BIGINT,
    allowNull: false,
    field: 'option_id',
  })
  declare optionId: number;

  @Column({
    type: DataType.STRING,
    allowNull: false,
    field: 'option_value',
  })
  declare value: string;

  @BelongsTo(() => TemplateOption, {
    foreignKey: 'option_id',
  })
  declare option: TemplateOption;
}
