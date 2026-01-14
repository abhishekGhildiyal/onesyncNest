import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/sequelize';
import {
  Brands,
  Inventory,
  InventoryRequest,
  Label,
  ProductList,
  TagSource,
  Template,
  TemplateOption,
  Variant,
  WithdrawnRequest,
} from '../entities';

@Injectable()
export class ProductRepository {
  constructor(
    @InjectModel(Brands)
    public readonly brandModel: typeof Brands,
    @InjectModel(ProductList)
    public readonly productListModel: typeof ProductList,
    @InjectModel(Inventory)
    public readonly inventoryModel: typeof Inventory,
    @InjectModel(InventoryRequest)
    public readonly inventoryRequestModel: typeof InventoryRequest,
    @InjectModel(Variant)
    public readonly variantModel: typeof Variant,

    @InjectModel(TagSource)
    public readonly tagSourceModel: typeof TagSource,

    @InjectModel(Label)
    public readonly labelModel: typeof Label,
    @InjectModel(Template)
    public readonly templateModel: typeof Template,
    @InjectModel(TemplateOption)
    public readonly templateOptionModel: typeof TemplateOption,

    @InjectModel(WithdrawnRequest)
    public readonly WithdrawnRequestModel: typeof WithdrawnRequest,
  ) {}
}
