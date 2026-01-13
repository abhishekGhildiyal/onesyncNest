import { Injectable } from '@nestjs/common';
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
    public readonly storeModel: typeof Store,
    public readonly storeLocationMappingModel: typeof StoreLocationMapping,
    public readonly storeAddressModel: typeof StoreAddress,

    public readonly locationModel: typeof Location,
    public readonly inventoryModel: typeof Inventory,
    public readonly inventoryRequestModel: typeof InventoryRequest,
    public readonly variantModel: typeof Variant,

    public readonly orderItemModel: typeof OrderItems,
    public readonly shopifyOrderReqModel: typeof ShopifyOrderRequest,

    public readonly payoutDetailModel: typeof PayoutDetails,
    public readonly payoutHistoryModel: typeof PayoutHistory,
    public readonly payoutRecordModel: typeof PayoutRecord,

    public readonly priceChangeRequestModel: typeof PriceChangeRequest,
  ) {}
}
