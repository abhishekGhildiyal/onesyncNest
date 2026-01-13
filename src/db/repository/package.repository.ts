import { Injectable } from '@nestjs/common';
import {
  AccessPackageBrand,
  AccessPackageBrandItems,
  AccessPackageBrandItemsCapacity,
  AccessPackageBrandItemsQty,
  AccessPackageCustomer,
  AccessPackageOrder,
  ConsumerInventory,
  ConsumerProductList,
  ConsumerProductsMapping,
  ConsumerProductVariants,
  ConsumerShippingAddress,
  Invoice,
  PackageBrand,
  PackageBrandItems,
  PackageBrandItemsCapacity,
  PackageBrandItemsQty,
  PackageCustomer,
  PackageOrder,
  PackagePayment,
  PackageShipment,
} from '../entities';

@Injectable()
export class PackageRepository {
  constructor(
    public readonly accessPackageBrandItemsCapacityModel: typeof AccessPackageBrandItemsCapacity,
    public readonly accessPackageBrandItemsQtyModel: typeof AccessPackageBrandItemsQty,
    public readonly accessPackageBrandItemsModel: typeof AccessPackageBrandItems,
    public readonly accessPackageBrandModel: typeof AccessPackageBrand,
    public readonly accessPackageCustomerModel: typeof AccessPackageCustomer,
    public readonly accessPackageOrderModel: typeof AccessPackageOrder,

    public readonly packageBrandItemsCapacityModel: typeof PackageBrandItemsCapacity,
    public readonly packageBrandItemsQtyModel: typeof PackageBrandItemsQty,
    public readonly packageBrandItemsModel: typeof PackageBrandItems,
    public readonly packageBrandModel: typeof PackageBrand,
    public readonly packageCustomerModel: typeof PackageCustomer,
    public readonly packageOrderModel: typeof PackageOrder,
    public readonly packagePaymentModel: typeof PackagePayment,
    public readonly packageShipmentModel: typeof PackageShipment,

    public readonly consumerInventoryModel: typeof ConsumerInventory,
    public readonly consumerProductModel: typeof ConsumerProductList,
    public readonly consumerProductVariantModel: typeof ConsumerProductVariants,
    public readonly consumerProductsMappingModel: typeof ConsumerProductsMapping,
    public readonly consumerShippingModel: typeof ConsumerShippingAddress,

    public readonly invoiceModel: typeof Invoice,
  ) {}
}
