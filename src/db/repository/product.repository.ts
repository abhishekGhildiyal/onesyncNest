import { Injectable } from '@nestjs/common';
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
    public readonly brandModel: typeof Brands,
    public readonly productListModel: typeof ProductList,
    public readonly inventoryModel: typeof Inventory,
    public readonly inventoryRequestModel: typeof InventoryRequest,
    public readonly variantModel: typeof Variant,

    public readonly tagSourceModel: typeof TagSource,

    public readonly labelModel: typeof Label,
    public readonly templateModel: typeof Template,
    public readonly templateOptionModel: typeof TemplateOption,

    public readonly WithdrawnRequestModel: typeof WithdrawnRequest,
  ) {}
}
