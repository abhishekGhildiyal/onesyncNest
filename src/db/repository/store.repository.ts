import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/sequelize';
import {
  Inventory,
  InventoryRequest,
  Location,
  OrderItems,
  PayoutDetails,
  PayoutHistory,
  PayoutRecord,
  PriceChangeRequest,
  ShopifyOrderRequest,
  Store,
  StoreAddress,
  StoreLocationMapping,
  Variant,
} from '../entities';

@Injectable()
export class StoreRepository {
  constructor(
    @InjectModel(Store)
    public readonly storeModel: typeof Store,
    @InjectModel(StoreLocationMapping)
    public readonly storeLocationMappingModel: typeof StoreLocationMapping,
    @InjectModel(StoreAddress)
    public readonly storeAddressModel: typeof StoreAddress,

    @InjectModel(Location)
    public readonly locationModel: typeof Location,
    @InjectModel(Inventory)
    public readonly inventoryModel: typeof Inventory,
    @InjectModel(InventoryRequest)
    public readonly inventoryRequestModel: typeof InventoryRequest,
    @InjectModel(Variant)
    public readonly variantModel: typeof Variant,

    @InjectModel(OrderItems)
    public readonly orderItemModel: typeof OrderItems,
    @InjectModel(ShopifyOrderRequest)
    public readonly shopifyOrderReqModel: typeof ShopifyOrderRequest,

    @InjectModel(PayoutDetails)
    public readonly payoutDetailModel: typeof PayoutDetails,
    @InjectModel(PayoutHistory)
    public readonly payoutHistoryModel: typeof PayoutHistory,
    @InjectModel(PayoutRecord)
    public readonly payoutRecordModel: typeof PayoutRecord,

    @InjectModel(PriceChangeRequest)
    public readonly priceChangeRequestModel: typeof PriceChangeRequest,
  ) {}
}
