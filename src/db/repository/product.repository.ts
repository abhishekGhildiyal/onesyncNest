import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/sequelize';
import {
  ActivityLog,
  AuditItem,
  AuditSession,
  Brands,
  Channel,
  CustomFieldDefinition,
  CustomFieldValue,
  CustomFieldValueAud,
  Inventory,
  InventoryRequest,
  Label,
  PaymentForm,
  PriceChangeRequest,
  ProductList,
  Revinfo,
  TagSource,
  Template,
  TemplateItemLabel,
  TemplateOption,
  TransferItem,
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
    @InjectModel(PriceChangeRequest)
    public readonly priceChangeRequestModel: typeof PriceChangeRequest,

    @InjectModel(CustomFieldDefinition)
    public readonly customFieldDefinitionModel: typeof CustomFieldDefinition,
    @InjectModel(CustomFieldValue)
    public readonly customFieldValueModel: typeof CustomFieldValue,
    @InjectModel(CustomFieldValueAud)
    public readonly customFieldValueAudModel: typeof CustomFieldValueAud,
    @InjectModel(Revinfo)
    public readonly revinfoModel: typeof Revinfo,
    @InjectModel(ActivityLog)
    public readonly activityLogModel: typeof ActivityLog,
    @InjectModel(TemplateItemLabel)
    public readonly templateItemLabelModel: typeof TemplateItemLabel,
    @InjectModel(Channel)
    public readonly channelModel: typeof Channel,
    @InjectModel(PaymentForm)
    public readonly paymentFormModel: typeof PaymentForm,
    @InjectModel(TransferItem)
    public readonly transferItemModel: typeof TransferItem,
    @InjectModel(AuditItem)
    public readonly auditItemModel: typeof AuditItem,
    @InjectModel(AuditSession)
    public readonly auditSessionModel: typeof AuditSession,
  ) {}
}
