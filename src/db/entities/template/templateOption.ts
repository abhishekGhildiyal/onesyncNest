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
export class TemplateOption extends Model<TemplateOption> {
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
  key: string;

  @HasMany(() => TemplateOptionValue, {
    foreignKey: 'option_id',
  })
  values: TemplateOptionValue[];
}

// ==================== TemplateOptionValue Entity ====================
@Table({
  tableName: 'template_option_values',
  timestamps: false,
})
export class TemplateOptionValue extends Model<TemplateOptionValue> {
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
  optionId: number;

  @Column({
    type: DataType.STRING,
    allowNull: false,
    field: 'option_value',
  })
  value: string;

  @BelongsTo(() => TemplateOption, {
    foreignKey: 'option_id',
  })
  option: TemplateOption;
}
