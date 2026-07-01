import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/sequelize';
import { Channel } from '../entities/channel/channel';
import { OrderItems } from '../entities/order/orderItems';
import { Orders } from '../entities/order/orders';
import { ShopifyOrderRequest } from '../entities/order/shopifyOrderreq';
import { Addresses } from '../entities/user/addresses';
import { Customers } from '../entities/user/customer';
import { CustomerStoreMapping } from '../entities/user/customerStoreMapping';

@Injectable()
export class OrderRepository {
  constructor(
    @InjectModel(Orders)
    public readonly ordersModel: typeof Orders,
    @InjectModel(Channel)
    public readonly channelModel: typeof Channel,
    @InjectModel(Addresses)
    public readonly addressesModel: typeof Addresses,
    @InjectModel(CustomerStoreMapping)
    public readonly customerStoreMappingModel: typeof CustomerStoreMapping,
    @InjectModel(Customers)
    public readonly customersModel: typeof Customers,
    @InjectModel(OrderItems)
    public readonly orderItemsModel: typeof OrderItems,
    @InjectModel(ShopifyOrderRequest)
    public readonly shopifyOrderRequestModel: typeof ShopifyOrderRequest,
  ) {}
}
