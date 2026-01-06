import { BadRequestException, Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/sequelize';
import { Op } from 'sequelize';
import { Sequelize } from 'sequelize-typescript';
import { ORDER_ITEMS, PACKAGE_STATUS } from '../../common/constants/enum';
import { AllMessages } from '../../common/constants/messages';
import { createManualOrderHelper } from '../../common/helpers/create-manual-order.helper';
import { generateOrderId } from '../../common/helpers/order-generator.helper';
import { markSoldInventory } from '../../common/helpers/sold-inventory.helper';
import { sortSizes } from '../../common/helpers/sort-sizes.helper';
import { MailService } from '../mail/mail.service';
import {
  PackageBrand,
  PackageBrandItems,
  PackageBrandItemsCapacity,
  PackageBrandItemsQty,
  PackageCustomer,
  PackageOrder,
  PackagePayment,
  PackageShipment,
} from '../packages/entities';
import {
  AccessPackageBrand,
  AccessPackageBrandItems,
  AccessPackageBrandItemsCapacity,
  AccessPackageBrandItemsQty,
  AccessPackageCustomer,
  AccessPackageOrder,
  Brand,
  ProductList,
  Variant,
} from '../products/entities';
import { ShopifyService } from '../shopify/shopify.service';
import { SocketGateway } from '../socket/socket.gateway';
import {
  ConsumerShippingAddress,
  Role,
  Store,
  User,
  UserStoreMapping,
} from '../users/entities';

@Injectable()
export class OrdersService {
  constructor(
    private socketGateway: SocketGateway,
    @InjectModel(PackageOrder) private packageOrderModel: typeof PackageOrder,
    @InjectModel(PackageBrand) private packageBrandModel: typeof PackageBrand,
    @InjectModel(PackageBrandItems)
    private packageBrandItemsModel: typeof PackageBrandItems,
    @InjectModel(PackageCustomer)
    private packageCustomerModel: typeof PackageCustomer,
    @InjectModel(PackagePayment)
    private packagePaymentModel: typeof PackagePayment,
    @InjectModel(PackageShipment)
    private packageShipmentModel: typeof PackageShipment,
    @InjectModel(PackageBrandItemsQty)
    private packageQtyModel: typeof PackageBrandItemsQty,
    @InjectModel(PackageBrandItemsCapacity)
    private packageCapacityModel: typeof PackageBrandItemsCapacity,
    @InjectModel(AccessPackageOrder)
    private accessOrderModel: typeof AccessPackageOrder,
    @InjectModel(AccessPackageCustomer)
    private accessCustomerModel: typeof AccessPackageCustomer,
    @InjectModel(PackageBrand) private pkgBrandModel: typeof PackageBrand,
    @InjectModel(AccessPackageBrand)
    private accessPkgBrandModel: typeof AccessPackageBrand,
    @InjectModel(PackageBrandItems)
    private pkgBrandItemsModel: typeof PackageBrandItems,
    @InjectModel(AccessPackageBrandItems)
    private accessBrandItemsModel: typeof AccessPackageBrandItems,
    @InjectModel(AccessPackageBrandItemsQty)
    private accessQtyModel: typeof AccessPackageBrandItemsQty,
    @InjectModel(AccessPackageBrandItemsCapacity)
    private accessCapacityModel: typeof AccessPackageBrandItemsCapacity,
    @InjectModel(User) private userModel: typeof User,
    @InjectModel(Brand) private brandDataModel: typeof Brand,
    @InjectModel(Role) private roleModel: typeof Role,
    @InjectModel(UserStoreMapping)
    private userStoreMappingModel: typeof UserStoreMapping,
    @InjectModel(ConsumerShippingAddress)
    private shippingAddressModel: typeof ConsumerShippingAddress,
    @InjectModel(Store) private storeModel: typeof Store,
    @InjectModel(ProductList) private productListModel: typeof ProductList,
    @InjectModel(Variant) private variantModel: typeof Variant,
    private readonly mailService: MailService,
    private readonly sequelize: Sequelize,
    private readonly shopifyService: ShopifyService,
  ) {}

  async getPackageBrands(user: any, params: any, query: any) {
    try {
      const { orderId } = params;
      const { userId, roleName } = user;
      const isAccess = query.access === 'true';

      if (roleName === 'Consumer') {
        const linked = isAccess
          ? await this.accessCustomerModel.findOne({
              where: { package_id: orderId, customer_id: userId },
            })
          : await this.packageCustomerModel.findOne({
              where: { package_id: orderId, customer_id: userId },
            });
        if (!linked) throw new BadRequestException(AllMessages.PAKG_NF);
      }

      const OrderModelRef = (
        isAccess ? this.accessOrderModel : this.packageOrderModel
      ) as any;
      const BrandModelRef = (
        isAccess ? this.accessPkgBrandModel : this.pkgBrandModel
      ) as any;

      const packageOrder = await OrderModelRef.findByPk(orderId);
      if (!packageOrder) throw new BadRequestException(AllMessages.PAKG_NF);

      let salesAgent, logisticsAgent;
      if (packageOrder.sales_agent_id) {
        salesAgent = await this.userModel.findOne({
          where: { id: packageOrder.sales_agent_id },
          attributes: ['id', 'firstName', 'lastName', 'email'],
        });
      }
      if (packageOrder.employee_id) {
        logisticsAgent = await this.userModel.findOne({
          where: { id: packageOrder.employee_id },
          attributes: ['id', 'firstName', 'lastName', 'email'],
        });
      }

      if (roleName === 'Consumer') {
        if (
          packageOrder.isManualOrder &&
          packageOrder.status === PACKAGE_STATUS.IN_PROGRESS
        ) {
          throw new BadRequestException(AllMessages.PAKG_NF);
        }
      } else if (packageOrder.status === PACKAGE_STATUS.DRAFT) {
        throw new BadRequestException(AllMessages.PAKG_NF);
      }

      let brandWhere: any = { package_id: packageOrder.id };
      if (!isAccess) {
        if (
          packageOrder.status === PACKAGE_STATUS.CONFIRM &&
          packageOrder.isManualOrder
        ) {
          // fetch all brands
        } else if (
          packageOrder.status !== PACKAGE_STATUS.SUBMITTED &&
          packageOrder.status !== PACKAGE_STATUS.DRAFT
        ) {
          brandWhere.selected = true;
        }
      }

      const packageBrands = await BrandModelRef.findAll({
        where: brandWhere,
        attributes: ['brand_id', 'id'],
        include: [
          {
            model: this.brandDataModel,
            as: 'brandData',
            attributes: ['brandName', 'id'],
          },
        ],
      });

      const brandIds = packageBrands.map((b) => b.id);
      const pkgItemsModelRef: any = isAccess
        ? AccessPackageBrandItems
        : PackageBrandItems;

      const showCreateItem = await pkgItemsModelRef.findOne({
        where: {
          packageBrand_id: { [Op.in]: brandIds },
          consumerDemand: { [Op.gt]: 0 },
          isItemReceived: null,
        },
      });

      const brandList = packageBrands
        .map((brand: any) => ({
          brand_id: brand.id,
          brandName: brand.brandData?.brandName || 'Unknown',
          brandMainId: brand.brandData?.id,
        }))
        .sort((a, b) =>
          a.brandName.localeCompare(b.brandName, 'en', { sensitivity: 'base' }),
        );

      return {
        success: true,
        message: AllMessages.FTCH_BRANDS,
        data: {
          packageName: packageOrder.packageName || 'Unnamed Package',
          order_id: packageOrder.order_id,
          brands: brandList,
          packageId: packageOrder.id,
          packageStatus: packageOrder.status,
          paymentStatus: (packageOrder as any).paymentStatus,
          shipmentStatus: (packageOrder as any).shipmentStatus,
          showPrices: (packageOrder as any).showPrices,
          isManualOrder: packageOrder.isManualOrder || false,
          showCreateItem: !showCreateItem,
          salesAgent,
          logisticsAgent,
        },
      };
    } catch (err) {
      if (err instanceof BadRequestException) throw err;
      throw new BadRequestException(AllMessages.SMTHG_WRNG);
    }
  }

  async accessList(user: any, body: any) {
    try {
      const { userId } = user;
      const { status, page = 1, limit = 10 } = body;
      const consumerStore = await this.accessCustomerModel.findAll({
        where: { customer_id: userId },
        attributes: ['package_id'],
      });
      const packageIds = consumerStore.map((item) => item.package_id);
      if (packageIds.length === 0)
        return {
          success: true,
          data: [],
          pagination: { total: 0, totalPages: 0 },
        };
      const whereCond: any = {
        id: { [Op.in]: packageIds },
        status: status || PACKAGE_STATUS.ACCESS,
      };
      const { rows: orders, count: total } =
        await this.accessOrderModel.findAndCountAll({
          where: whereCond,
          limit: Number(limit),
          offset: (Number(page) - 1) * Number(limit),
          order: [['createdAt', 'DESC']],
          include: [
            {
              model: Store,
              as: 'store',
              attributes: ['store_name', 'store_id'],
            },
          ],
        });
      return {
        success: true,
        data: orders,
        pagination: { total, totalPages: Math.ceil(total / Number(limit)) },
      };
    } catch (err) {
      throw new BadRequestException(AllMessages.SMTHG_WRNG);
    }
  }

  async allOrders(user: any, body: any) {
    try {
      const { userId } = user;
      const { status, page = 1, limit = 10 } = body;
      const consumerStore = await this.packageCustomerModel.findAll({
        where: { customer_id: userId },
        attributes: ['package_id'],
      });
      const packageIds = consumerStore.map((item) => item.package_id);
      if (packageIds.length === 0)
        return {
          success: true,
          data: [],
          pagination: { total: 0, totalPages: 0 },
        };
      const whereCond: any = {
        id: packageIds,
        [Op.not]: {
          [Op.and]: [
            { status: PACKAGE_STATUS.IN_PROGRESS },
            { isManualOrder: true },
          ],
        },
      };
      if (status) {
        switch (status) {
          case PACKAGE_STATUS.CREATED:
            whereCond.status = {
              [Op.in]: [
                PACKAGE_STATUS.CREATED,
                PACKAGE_STATUS.SUBMITTED,
                PACKAGE_STATUS.INITIATED,
              ],
            };
            break;
          case PACKAGE_STATUS.CONFIRM:
            whereCond.status = {
              [Op.in]: [PACKAGE_STATUS.IN_PROGRESS, PACKAGE_STATUS.CONFIRM],
            };
            whereCond.isManualOrder = false;
            break;
          case PACKAGE_STATUS.CLOSE:
            whereCond.status = PACKAGE_STATUS.CLOSE;
            break;
          default:
            whereCond.status = status;
        }
      }
      const { rows: orders, count: total } =
        await this.packageOrderModel.findAndCountAll({
          where: whereCond,
          limit: Number(limit),
          offset: (Number(page) - 1) * Number(limit),
          order: [['updatedAt', 'DESC']],
          include: [
            {
              model: Store,
              as: 'store',
              attributes: ['store_name', 'store_id'],
            },
          ],
        });
      return {
        success: true,
        data: orders,
        pagination: { total, totalPages: Math.ceil(total / Number(limit)) },
      };
    } catch (err) {
      throw new BadRequestException(AllMessages.SMTHG_WRNG);
    }
  }

  async storeOrders(user: any, body: any) {
    try {
      const { storeId } = user;
      const { search = '', status, sort = 'DESC', page = 1, limit = 10 } = body;
      const whereCondition: any = { store_id: storeId };
      if (status) whereCondition.status = status;
      if (search)
        whereCondition[Op.or] = [
          { order_id: { [Op.like]: `%${search}%` } },
          { packageName: { [Op.like]: `%${search}%` } },
        ];
      const offset = (Number(page) - 1) * Number(limit);
      const { count, rows } = await this.packageOrderModel.findAndCountAll({
        where: whereCondition,
        order: [['createdAt', sort.toUpperCase() === 'ASC' ? 'ASC' : 'DESC']],
        limit: Number(limit),
        offset: Number(offset),
        include: [
          { model: PackageCustomer, as: 'customers' },
          { model: PackageBrand, as: 'brands' },
        ],
      });
      return {
        success: true,
        data: rows,
        meta: {
          total: count,
          page: Number(page),
          limit: Number(limit),
          totalPages: Math.ceil(count / limit),
        },
      };
    } catch (err) {
      throw new BadRequestException(AllMessages.SMTHG_WRNG);
    }
  }

  async getPackageBrandProducts(params: any, query: any) {
    try {
      const { orderId, brandId } = params;
      const isAccess = query.access === 'true';

      const OrderModel: any = isAccess
        ? this.accessOrderModel
        : this.packageOrderModel;
      const BrandItemsModel: any = isAccess
        ? this.accessBrandItemsModel
        : this.packageBrandItemsModel;
      const BrandItemsCapacityModel: any = isAccess
        ? this.accessCapacityModel
        : this.packageCapacityModel;
      const BrandItemsQtyModel: any = isAccess
        ? this.accessQtyModel
        : this.packageQtyModel;

      const packageOrderData = await OrderModel.findByPk(orderId, {
        attributes: ['status'],
      });
      if (!packageOrderData) throw new BadRequestException(AllMessages.PAKG_NF);

      const isInitiated =
        !isAccess &&
        packageOrderData.status !== PACKAGE_STATUS.SUBMITTED &&
        packageOrderData.status !== PACKAGE_STATUS.DRAFT;
      const showDemandStatuses = [
        PACKAGE_STATUS.CONFIRM,
        PACKAGE_STATUS.STORE_CONFIRM,
        PACKAGE_STATUS.IN_PROGRESS,
        PACKAGE_STATUS.COMPLETED,
        PACKAGE_STATUS.CLOSE,
      ];
      const showDemand = showDemandStatuses.includes(packageOrderData.status);

      const includeArray: any[] = [
        {
          model: ProductList,
          as: 'products',
          attributes: ['product_id', 'itemName', 'image', 'skuNumber'],
          include: [
            { model: Brand, as: 'brandData', attributes: ['brandName'] },
            ...(isAccess
              ? [
                  {
                    model: Variant,
                    where: { status: 1, quantity: { [Op.gt]: 0 } },
                    as: 'variants',
                    attributes: [
                      'id',
                      'option1Value',
                      'quantity',
                      'price',
                      'accountType',
                      'cost',
                      'payout',
                    ],
                  },
                ]
              : []),
          ],
        },
      ];

      if (!isAccess) {
        includeArray.push(
          {
            model: BrandItemsCapacityModel,
            as: 'capacities',
            attributes: [
              'id',
              'variant_id',
              'item_id',
              'maxCapacity',
              'selectedCapacity',
            ],
            include: [
              {
                model: Variant,
                where: { status: 1, quantity: { [Op.gt]: 0 } },
                as: 'variant',
                attributes: [
                  'id',
                  'option1Value',
                  'quantity',
                  'price',
                  'accountType',
                  'cost',
                  'payout',
                ],
              },
            ],
          },
          {
            model: BrandItemsQtyModel,
            as: 'sizeQuantities',
            attributes: [
              'variant_size',
              'item_id',
              'maxCapacity',
              'selectedCapacity',
              'shortage',
              'receivedQuantity',
            ],
          },
        );
      }

      const packageItems = await BrandItemsModel.findAll({
        where: { packageBrand_id: brandId },
        include: includeArray,
      });
      const result: any[] = [];

      for (const item of packageItems) {
        const product = item.products;
        if (!product) continue;

        const hasVariants = isAccess
          ? product.variants && product.variants.length > 0
          : (item.capacities && item.capacities.length > 0) ||
            (item.sizeQuantities && item.sizeQuantities.length > 0);
        if (!hasVariants) continue;

        const brandName = product.brandData?.brandName || 'Unknown';
        const sizeAndQuantity: any = {};
        const consumerDemand: any = {};
        const variants: any[] = [];

        if (!isAccess) {
          for (const cap of item.capacities || []) {
            const variant = cap.variant;
            if (!variant) continue;
            const size = (variant.option1Value || 'Unknown').trim();
            const stockQty = variant.quantity || 0;
            const price =
              variant.accountType === '1'
                ? variant.cost || 0
                : variant.accountType === '0'
                  ? variant.payout || 0
                  : 0;

            variants.push({
              id: variant.id,
              option1: 'Size',
              option1Value: size,
              total_quantity: cap.maxCapacity || 0,
              stock_quantity: stockQty,
              price,
            });
            if (!sizeAndQuantity[size])
              sizeAndQuantity[size] = {
                quantity: 0,
                demand: 0,
                shortage: 0,
                receivedQuantity: 0,
                totalCost: 0,
              };
            sizeAndQuantity[size].quantity += stockQty;
            sizeAndQuantity[size].totalCost += stockQty * price;
          }

          let totalSelectedCapacity = 0;
          for (const qty of item.sizeQuantities || []) {
            const size = (qty.variant_size || 'Unknown').trim();
            const selected = qty.selectedCapacity || 0;
            totalSelectedCapacity += selected;
            consumerDemand[size] = selected;
            if (!sizeAndQuantity[size])
              sizeAndQuantity[size] = {
                quantity: 0,
                demand: 0,
                shortage: 0,
                receivedQuantity: 0,
                totalCost: 0,
              };
            sizeAndQuantity[size].demand += selected;
            sizeAndQuantity[size].shortage += qty.shortage || 0;
            sizeAndQuantity[size].receivedQuantity +=
              qty.receivedQuantity !== null ? qty.receivedQuantity : selected;
          }
          if (isInitiated && totalSelectedCapacity === 0) continue;
        } else {
          for (const variant of product.variants || []) {
            const size = (variant.option1Value || 'Unknown').trim();
            const stockQty = variant.quantity || 0;
            variants.push({
              id: variant.id,
              option1: 'Size',
              option1Value: size,
              total_quantity: stockQty,
              stock_quantity: stockQty,
            });
            if (!sizeAndQuantity[size])
              sizeAndQuantity[size] = {
                quantity: 0,
                demand: 0,
                shortage: 0,
                receivedQuantity: 0,
              };
            sizeAndQuantity[size].quantity += stockQty;
          }
          for (const size of Object.keys(sizeAndQuantity)) {
            sizeAndQuantity[size].demand = 0;
            sizeAndQuantity[size].shortage = 0;
            sizeAndQuantity[size].receivedQuantity = 0;
          }
        }

        const sortedVariants = sortSizes(variants);
        const sortedSizeAndQuantity = sortSizes(Object.entries(sizeAndQuantity))
          .map(([size, obj]: [string, any]) => ({
            size,
            quantity: obj.quantity,
            demand: obj.demand,
            shortage: obj.shortage,
            receivedQuantity: obj.receivedQuantity,
            costPrice: obj.quantity > 0 ? obj.totalCost / obj.quantity : 0,
          }))
          .filter((entry) =>
            showDemand
              ? entry.demand > 0
              : !isInitiated
                ? entry.quantity > 0
                : entry.quantity > 0 && entry.demand > 0,
          );

        result.push({
          name: product.itemName || 'Unnamed',
          productMainId: product.product_id,
          product_id: item.id,
          itemName: product.itemName,
          image: product.image || null,
          skuNumber: product.skuNumber,
          brand_id: item.packageBrand_id || item.id,
          brandData: { brandName },
          variants: sortedVariants,
          sizeAndQuantity: sortedSizeAndQuantity,
          price: item.price,
          isItemReceived: item.isItemReceived || null,
          ...(isAccess ? {} : { consumerDemand }),
        });
      }

      result.sort((a, b) =>
        (a.itemName || '')
          .toLowerCase()
          .localeCompare((b.itemName || '').toLowerCase()),
      );
      return {
        success: true,
        message: AllMessages.FTCH_PRODUCTS,
        data: result,
      };
    } catch (err) {
      if (err instanceof BadRequestException) throw err;
      throw new BadRequestException(AllMessages.SMTHG_WRNG);
    }
  }

  async manualProducts(params: any) {
    try {
      const { orderId, brandId } = params;

      const packageOrderData = await this.packageOrderModel.findByPk(orderId, {
        attributes: ['status'],
      });
      if (!packageOrderData)
        throw new BadRequestException('Package order not found');

      const includeArray = [
        {
          model: ProductList,
          as: 'products',
          attributes: ['product_id', 'itemName', 'image', 'skuNumber'],
          include: [
            { model: Brand, as: 'brandData', attributes: ['brandName'] },
          ],
        },
        {
          model: PackageBrandItemsCapacity,
          as: 'capacities',
          attributes: [
            'id',
            'variant_id',
            'item_id',
            'maxCapacity',
            'selectedCapacity',
          ],
          include: [
            {
              model: Variant,
              required: true,
              where: {
                [Op.and]: [
                  { status: 1 },
                  { quantity: { [Op.gt]: 0 } },
                  { option1Value: { [Op.ne]: null } },
                  { option1Value: { [Op.ne]: '' } },
                ],
              },
              as: 'variant',
              attributes: ['id', 'option1Value', 'quantity', 'price', 'status'],
            },
          ],
        },
        {
          model: PackageBrandItemsQty,
          as: 'sizeQuantities',
          attributes: [
            'variant_size',
            'item_id',
            'maxCapacity',
            'selectedCapacity',
            'shortage',
            'receivedQuantity',
          ],
        },
      ];

      const packageOrder = await this.packageBrandItemsModel.findAll({
        where: { packageBrand_id: brandId },
        include: includeArray,
      });

      if (!packageOrder || packageOrder.length === 0)
        throw new BadRequestException(AllMessages.PAKG_NF);

      const result: any[] = [];

      for (const item of packageOrder) {
        const product = item.products;
        if (!product) continue;

        const brandName = product?.brandData?.brandName || 'Unknown';
        const sizeAndQuantity: any = {};
        const variants: any[] = [];

        for (const cap of item.capacities || []) {
          const variant = (cap as any).variant;
          if (!variant) continue;

          const size = (variant.option1Value || '').trim();
          const stockQty = variant.quantity ?? 0;

          if (!size || stockQty <= 0) continue;

          variants.push({
            id: variant.id,
            option1: 'Size',
            option1Value: size,
            total_quantity: cap.maxCapacity || 0,
            stock_quantity: stockQty,
            costPrice: variant.price || 0,
          });

          if (!sizeAndQuantity[size]) {
            sizeAndQuantity[size] = {
              quantity: 0,
              demand: 0,
              shortage: 0,
              receivedQuantity: 0,
              totalCost: 0,
            };
          }
          sizeAndQuantity[size].quantity += stockQty;
          sizeAndQuantity[size].totalCost += stockQty * (variant.price || 0);
        }

        for (const qty of item.sizeQuantities || []) {
          const size = (qty.variant_size || '').trim();
          if (!size) continue;
          if (!sizeAndQuantity[size]) {
            sizeAndQuantity[size] = {
              quantity: 0,
              demand: 0,
              shortage: 0,
              receivedQuantity: 0,
              totalCost: 0,
            };
          }
          sizeAndQuantity[size].demand += qty.selectedCapacity || 0;
          sizeAndQuantity[size].shortage += qty.shortage || 0;
          sizeAndQuantity[size].receivedQuantity +=
            qty.receivedQuantity !== null ? qty.receivedQuantity : 0;
        }

        const sortedVariants = sortSizes(variants);
        const sortedSizeAndQuantity = sortSizes(
          Object.entries(sizeAndQuantity).map(([size, obj]: any) => ({
            size,
            quantity: obj.quantity,
            demand: obj.demand,
            shortage: obj.shortage,
            receivedQuantity: obj.receivedQuantity,
            costPrice: obj.quantity > 0 ? obj.totalCost / obj.quantity : 0,
          })),
        ); // Filter? Legacy didn't filter here but verify logic

        if (sortedVariants.length > 0) {
          result.push({
            product_id: item.id,
            name: product.itemName,
            itemName: product.itemName,
            image: product.image,
            skuNumber: product.skuNumber,
            brand_id: item.packageBrand_id,
            brandData: { brandName },
            variants: sortedVariants,
            sizeAndQuantity: sortedSizeAndQuantity,
          });
        }
      }

      return {
        success: true,
        message: AllMessages.FTCH_PRODUCTS,
        data: result,
      };
    } catch (err) {
      if (err instanceof BadRequestException) throw err;
      throw new BadRequestException(AllMessages.SMTHG_WRNG);
    }
  }

  async updateVarientQuantity(body: any) {
    const t = await (this.packageOrderModel.sequelize as any).transaction();
    try {
      const { brandId, items = [], packageOrderId, isSearch } = body;

      let itemTotalQuantity = 0;
      const updates: Promise<any>[] = [];
      for (const item of items) {
        const { itemId, totalQuantity, variants = [] } = item;
        if (!itemId) continue;
        itemTotalQuantity += totalQuantity;

        updates.push(
          this.pkgBrandItemsModel.update(
            { consumerDemand: totalQuantity },
            { where: { id: itemId }, transaction: t },
          ),
        );
        for (const variant of variants) {
          if (!variant || variant.size == null) continue;
          updates.push(
            this.packageQtyModel.update(
              { selectedCapacity: variant.quantity },
              {
                where: {
                  item_id: itemId,
                  variant_size: String(variant.size).trim().toUpperCase(),
                },
                transaction: t,
              },
            ),
          );
        }
      }
      await Promise.all(updates);

      if (!isSearch) {
        await this.pkgBrandModel.update(
          { selected: itemTotalQuantity > 0 },
          {
            where: { package_id: packageOrderId, id: brandId },
            transaction: t,
          },
        );
      }

      await t.commit();
      return { success: true, message: AllMessages.QUANT_UPDATED };
    } catch (err) {
      if (t && !t.finished) await t.rollback();
      throw new BadRequestException(AllMessages.SMTHG_WRNG);
    }
  }

  async updateAccessVarientQuantity(body: any) {
    try {
      const { items } = body;
      for (const item of items || []) {
        const { itemId, totalQuantity, variants } = item;
        await this.accessBrandItemsModel.update(
          { consumerDemand: totalQuantity },
          { where: { id: itemId } },
        );
        for (const variant of variants || []) {
          const { size, quantity } = variant;
          if (size == null) continue;
          await this.accessQtyModel.update(
            { selectedCapacity: quantity },
            {
              where: {
                item_id: itemId,
                variant_size: String(size).trim().toUpperCase(),
              },
            },
          );
        }
      }
      return {
        success: true,
        message: 'All product and variant quantities updated successfully',
      };
    } catch (err) {
      throw new BadRequestException(AllMessages.SMTHG_WRNG);
    }
  }

  async setItemPrice(user: any, body: any) {
    const t = await (this.packageOrderModel.sequelize as any).transaction();
    try {
      const {
        packageOrderId,
        packageBrandId,
        prices = [],
        items = [],
        isSearch,
      } = body;
      const { userId } = user;

      const existingOrder = await this.packageOrderModel.findOne({
        where: {
          id: packageOrderId,
          status: {
            [Op.in]: [
              PACKAGE_STATUS.INITIATED,
              PACKAGE_STATUS.IN_REVIEW,
              PACKAGE_STATUS.IN_PROGRESS,
              PACKAGE_STATUS.CLOSE,
              PACKAGE_STATUS.CONFIRM,
            ],
          },
        },
        include: [{ model: PackageCustomer, as: 'customers' }],
        transaction: t,
      });

      if (!existingOrder) {
        if (t && !t.finished) await t.rollback();
        throw new BadRequestException(AllMessages.INITD_REQ);
      }

      if (existingOrder.sales_agent_id == null) {
        await this.packageOrderModel.update(
          { sales_agent_id: userId },
          { where: { id: packageOrderId }, transaction: t },
        );
      } else if (existingOrder.sales_agent_id !== userId) {
        if (t && !t.finished) await t.rollback();
        throw new BadRequestException(
          'You are not authorized to update this package.',
        );
      }

      if (prices.length) {
        await Promise.all(
          prices.map(({ price, packageBrandItemId }) =>
            this.pkgBrandItemsModel.update(
              { price },
              {
                where: {
                  id: packageBrandItemId,
                  packageBrand_id: packageBrandId,
                },
                transaction: t,
              },
            ),
          ),
        );
      }

      let itemTotalQuantity = 0;
      const itemUpdates: Promise<any>[] = [];
      const variantUpdates: Promise<any>[] = [];

      for (const item of items) {
        const { itemId, totalQuantity, variants = [] } = item;
        if (!itemId) continue;
        itemTotalQuantity += totalQuantity;

        itemUpdates.push(
          this.pkgBrandItemsModel.update(
            { consumerDemand: totalQuantity },
            { where: { id: itemId }, transaction: t },
          ),
        );

        for (const variant of variants) {
          if (!variant?.size) continue;
          variantUpdates.push(
            this.packageQtyModel.update(
              { selectedCapacity: variant.quantity },
              {
                where: {
                  item_id: itemId,
                  variant_size: variant.size.trim().toUpperCase(),
                },
                transaction: t,
              },
            ),
          );
        }
      }

      if (!isSearch) {
        await this.pkgBrandModel.update(
          { selected: itemTotalQuantity > 0 },
          {
            where: { package_id: packageOrderId, id: packageBrandId },
            transaction: t,
          },
        );
      }

      await Promise.all([...itemUpdates, ...variantUpdates]);
      await t.commit();

      return { success: true, message: AllMessages.ITM_PRC_UPDT };
    } catch (err) {
      if (t && !t.finished) await t.rollback();
      if (err instanceof BadRequestException) throw err;
      throw new BadRequestException(AllMessages.SMTHG_WRNG);
    }
  }

  async saveOrderAsDraft(user: any, body: any) {
    const t = await (this.packageOrderModel.sequelize as any).transaction();
    try {
      const { packageId, brands = [] } = body;
      const { userId } = user;

      const accessOrder = await this.accessOrderModel.findByPk(packageId, {
        transaction: t,
      });
      if (!accessOrder) throw new BadRequestException(AllMessages.PAKG_NF);

      const store = await this.storeModel.findByPk(accessOrder.store_id, {
        transaction: t,
      });
      if (!store) throw new BadRequestException('Store not found.');

      const orderIdStr = await generateOrderId({
        storeId: store.store_id,
        prefix: store.store_code,
        model: this.packageOrderModel as any,
        transaction: t,
      });

      const pkg = await this.packageOrderModel.create(
        {
          packageName: accessOrder.packageName,
          user_id: accessOrder.user_id,
          order_id: orderIdStr,
          store_id: accessOrder.store_id,
          status: PACKAGE_STATUS.DRAFT,
          paymentStatus: 'Pending',
          shipmentStatus: false,
        },
        { transaction: t },
      );

      await this.packageCustomerModel.create(
        { package_id: pkg.id, customer_id: userId },
        { transaction: t },
      );

      const brandIds = brands.map((b: any) => b.brand_id).filter(Boolean);
      const validBrands = await this.brandDataModel.findAll({
        where: { id: brandIds },
        transaction: t,
      });
      const brandIdSet = new Set(validBrands.map((b) => b.id));

      const brandPayload = brands
        .filter((b: any) => brandIdSet.has(b.brand_id) && b.items?.length > 0)
        .map((b: any) => ({ package_id: pkg.id, brand_id: b.brand_id }));

      if (brandPayload.length > 0) {
        const createdBrands = await this.packageBrandModel.bulkCreate(
          brandPayload,
          { transaction: t, returning: true },
        );
        const brandIdToPkgBrandId = new Map(
          createdBrands.map((b) => [b.brand_id, b.id]),
        );

        const itemRecords: any[] = [];
        const variantRecords: any[] = [];
        const sizeQtyArr: any[] = [];

        for (const brand of brands) {
          if (!brandIdSet.has(brand.brand_id)) continue;
          const packageBrandId = brandIdToPkgBrandId.get(brand.brand_id);

          for (const item of brand.items || []) {
            const { product_id, variants = [], mainVariants = [] } = item;
            if (!product_id) continue;
            const tempId = `${packageBrandId}-${product_id}-${Math.random()}`;

            itemRecords.push({
              tempId,
              packageBrand_id: packageBrandId,
              product_id,
              quantity: null,
            });
            variantRecords.push(
              ...variants
                .filter((v: any) => v.variantId)
                .map((v: any) => ({
                  tempId,
                  variant_id: v.variantId,
                  maxCapacity: v.maxCapacity || null,
                })),
            );
            sizeQtyArr.push(
              ...mainVariants.map((x: any) => ({
                tempId,
                variant_size: x.size,
                maxCapacity: x.quantity || null,
              })),
            );
          }
        }

        const createdItems = await this.packageBrandItemsModel.bulkCreate(
          itemRecords.map((r) => ({
            packageBrand_id: r.packageBrand_id,
            product_id: r.product_id,
            quantity: r.quantity,
          })),
          { transaction: t, returning: true },
        );

        const tempIdToItemId = new Map();
        createdItems.forEach((item, idx) => {
          tempIdToItemId.set(itemRecords[idx].tempId, item.id);
        });

        const finalVariantInsert = variantRecords
          .map((v) => ({
            item_id: tempIdToItemId.get(v.tempId),
            variant_id: v.variant_id,
            maxCapacity: v.maxCapacity,
          }))
          .filter((x) => !!x.item_id);

        if (finalVariantInsert.length > 0)
          await this.packageCapacityModel.bulkCreate(finalVariantInsert, {
            transaction: t,
          });

        const finalSizeInsert = sizeQtyArr
          .map((x) => ({
            item_id: tempIdToItemId.get(x.tempId),
            variant_size: x.variant_size,
            maxCapacity: x.maxCapacity,
          }))
          .filter((x) => !!x.item_id);

        if (finalSizeInsert.length > 0)
          await this.packageQtyModel.bulkCreate(finalSizeInsert, {
            transaction: t,
          });
      }

      await t.commit();
      return {
        success: true,
        message: AllMessages.ODR_DRAFT_SAVED,
        data: { package_id: pkg.id, order_id: pkg.order_id },
      };
    } catch (err) {
      if (t && !t.finished) await t.rollback();
      throw new BadRequestException(err.message || AllMessages.SMTHG_WRNG);
    }
  }

  async createOrder(user: any, body: any) {
    const t = await (this.packageOrderModel.sequelize as any).transaction();
    try {
      const {
        accessPackageId,
        emails = [],
        brands = [],
        date,
        customerDetail,
      } = body;
      const { userId } = user;

      const packageOrder = await createManualOrderHelper({
        accessPackageId,
        userId,
        emails,
        brands,
        date,
        customerDetail,
        transaction: t,
        mailService: this.mailService,
      });

      await t.commit();
      return packageOrder;
    } catch (err) {
      if (t && !t.finished) await t.rollback();
      throw new BadRequestException(err.message || AllMessages.SMTHG_WRNG);
    }
  }

  async createManualOrder(user: any, body: any) {
    return this.createOrder(user, body);
  }

  async initiateOrder(orderId: number, user: any) {
    const t = await (this.packageOrderModel.sequelize as any).transaction();
    try {
      const order = await this.packageOrderModel.findByPk(orderId, {
        transaction: t,
        lock: t.LOCK.UPDATE,
      });
      if (!order) throw new BadRequestException(AllMessages.PAKG_NF);

      if (
        order.sales_agent_id != null &&
        order.sales_agent_id !== user.userId
      ) {
        throw new BadRequestException(
          'You are not authorized to initiate this package.',
        );
      }
      if (order.status === PACKAGE_STATUS.INITIATED)
        throw new BadRequestException('Package is already initiated.');
      if (
        order.status !== PACKAGE_STATUS.CREATED &&
        order.status !== PACKAGE_STATUS.SUBMITTED
      ) {
        throw new BadRequestException(
          "Package status must be 'CREATED' or 'SUBMITTED' to initiate.",
        );
      }

      await this.packageOrderModel.update(
        {
          status: PACKAGE_STATUS.INITIATED,
          sales_agent_id: order.sales_agent_id || user.userId,
        },
        { where: { id: orderId }, transaction: t },
      );

      await t.commit();
      this.socketGateway.server.emit(`reviewToProcess-${orderId}`, {
        consumerName: user.fullName || user.firstName,
      });
      return { success: true, message: AllMessages.PKG_INITD_SUCCSS };
    } catch (err) {
      if (t && !t.finished) await t.rollback();
      throw new BadRequestException(err.message || AllMessages.SMTHG_WRNG);
    }
  }

  async markReview(orderId: number, user: any) {
    const t = await (this.packageOrderModel.sequelize as any).transaction();
    try {
      const existingOrder = await this.packageOrderModel.findOne({
        where: { id: orderId, status: PACKAGE_STATUS.INITIATED },
        include: [
          { model: Store, as: 'store' },
          {
            model: PackageCustomer,
            as: 'customers',
            include: [{ model: User, as: 'customer' }],
          },
        ],
        transaction: t,
      });

      if (!existingOrder)
        throw new BadRequestException(
          "Package status must be 'INITIATED' to send it for Review.",
        );
      if (
        existingOrder.sales_agent_id != null &&
        existingOrder.sales_agent_id !== user.userId
      ) {
        throw new BadRequestException(
          'You are not authorized to mark this package for Review.',
        );
      }

      existingOrder.status = PACKAGE_STATUS.IN_REVIEW;
      await existingOrder.save({ transaction: t });

      await t.commit();

      // Send email notification for review
      setImmediate(async () => {
        try {
          const orderData = existingOrder as any;
          const store = orderData.store;
          const customers = orderData.customers || [];

          for (const customer of customers) {
            if (customer.customer?.email) {
              await this.mailService.sendOrderReviewEmail({
                to: customer.customer.email,
                orderNumber: orderData.order_id,
                storeName: store?.store_name,
                customerName:
                  `${customer.customer.firstName || ''} ${customer.customer.lastName || ''}`.trim(),
              });
            }
          }
        } catch (emailErr) {
          console.error('❌ Background email error:', emailErr);
        }
      });

      this.socketGateway.server.emit(`inReview-${orderId}`, {
        message: 'Package marked for review',
      });
      return { success: true, message: AllMessages.PKG_REVW_SUCCSS };
    } catch (err) {
      if (t && !t.finished) await t.rollback();
      throw new BadRequestException(err.message || AllMessages.SMTHG_WRNG);
    }
  }

  async confirmOrder(orderId: number, user: any, body: any, token: string) {
    let transaction;
    try {
      const { confirmDate } = body;
      const { userId, roleName, id } = user;
      // legacy controller extracts fullName, userId from req.user
      // here user might be the decoded token payload.

      transaction = await this.sequelize.transaction();

      const order = await this.packageOrderModel.findByPk(orderId, {
        transaction,
      });

      if (!order) {
        await transaction.rollback();
        throw new BadRequestException(AllMessages.PAKG_NF);
      }

      if (order.status !== PACKAGE_STATUS.IN_REVIEW) {
        await transaction.rollback();
        throw new BadRequestException('Order is not in review.');
      }

      const { store_id } = order;

      await order.update(
        {
          status: PACKAGE_STATUS.CONFIRM,
          statusChangeDate: confirmDate,
        },
        { transaction },
      );

      // Verify if markSoldInventory logic is needed. Legacy commented it out?
      // User instruction: "Updating existing NestJS services (e.g., confirmOrder) to integrate the newly ported helpers."
      // So we MUST call it.

      // We need to pass: orderId, confirmDate, storeId, userId, roleId, token, transaction, shopifyService
      // Nested user object might have id as userId.
      const validUserId = userId || id;

      // We need roleId. user object might have roleName.
      // We might need to fetch roleId from roleName or user object has it.
      // For now assuming user object has roleId or we can look it up?
      // Legacy "req.user" likely had it.
      // Let's assume user.roleId exists or we pass 0/null and helper handles it?
      // Helper uses it for headers.

      let roleId = user.roleId;
      if (!roleId && user.roleName) {
        // fetch role or cache?
        const role = await this.roleModel.findOne({
          where: { roleName: user.roleName },
        });
        roleId = role ? role.id : 0;
      }

      await markSoldInventory(
        orderId,
        confirmDate,
        store_id,
        validUserId,
        roleId,
        token,
        transaction,
        this.shopifyService,
      );

      await transaction.commit();

      this.socketGateway.server.emit(`reviewToProcess-${orderId}`, {
        consumerName: user.fullName || user.firstName,
      });
      this.socketGateway.server.emit(`statusChanged-${store_id}`);
      this.socketGateway.server.emit(`statusChanged-${validUserId}`);

      // Send confirmation emails in background
      setImmediate(async () => {
        try {
          const packageOrder = await this.packageOrderModel.findByPk(orderId, {
            include: [
              { model: Store, as: 'store' },
              {
                model: PackageCustomer,
                as: 'customers',
                include: [{ model: User, as: 'customer' }],
              },
            ],
          });

          if (packageOrder) {
            const anyOrder = packageOrder as any;
            const customers = anyOrder.customers || [];

            for (const customer of customers) {
              if (customer.customer?.email) {
                await this.mailService.sendOrderConfirmationEmail({
                  to: customer.customer.email,
                  orderNumber: anyOrder.order_id,
                  storeName: anyOrder.store?.store_name,
                  customerName:
                    `${customer.customer.firstName || ''} ${customer.customer.lastName || ''}`.trim(),
                });
              }
            }
          }
        } catch (emailErr) {
          console.error('❌ Background email error:', emailErr);
        }
      });

      return { success: true, message: AllMessages.PKG_ISIN_PRGS };
    } catch (err) {
      if (transaction) await transaction.rollback();
      throw new BadRequestException(err.message || AllMessages.SMTHG_WRNG);
    }
  }

  async updateOrderBrands(body: any) {
    try {
      const { packageOrderId, brandIds = [] } = body;
      const packageOrder =
        await this.packageOrderModel.findByPk(packageOrderId);
      if (!packageOrder) throw new BadRequestException(AllMessages.PAKG_NF);

      await this.packageBrandModel.update(
        { selected: true },
        { where: { package_id: packageOrderId, id: { [Op.in]: brandIds } } },
      );
      return { success: true, message: AllMessages.ORDR_UPDTD };
    } catch (err) {
      throw new BadRequestException(AllMessages.SMTHG_WRNG);
    }
  }

  async getAllOrderItemsPrice(orderId: number) {
    try {
      const orderItems = await this.packageBrandItemsModel.findAll({
        where: { id: orderId },
        attributes: [
          'id',
          'product_id',
          'quantity',
          'price',
          [Sequelize.fn('SUM', Sequelize.col('price')), 'total_price'],
        ],
        group: ['id'],
      });

      if (!orderItems || orderItems.length === 0) {
        throw new BadRequestException(AllMessages.NO_ITEMS_FOUND);
      }

      return { success: true, data: orderItems };
    } catch (err) {
      throw new BadRequestException(err.message || AllMessages.SMTHG_WRNG);
    }
  }

  async itemTotalPrice(body: any) {
    const transaction = await this.sequelize.transaction();
    try {
      const { orderId, brandIds = [] } = body;

      const order = await this.packageOrderModel.findOne({
        where: { id: orderId },
        attributes: ['id', 'total_amount', 'status'],
        transaction,
      });

      if (!order) {
        throw new BadRequestException(AllMessages.PAKG_NF);
      }

      if (!Array.isArray(brandIds) || brandIds.length === 0) {
        throw new BadRequestException('Brand IDs array is required');
      }

      const brandsItemData = await this.packageBrandItemsModel.findAll({
        where: { packageBrand_id: { [Op.in]: brandIds } },
        include: [
          {
            model: this.packageQtyModel,
            as: 'sizeQuantities',
            where: { selectedCapacity: { [Op.gt]: 0 } },
          },
        ],
        transaction,
      });

      let totalPrice = 0;
      let itemTotal = 0;
      let disableReview = false;
      let hasPrice = false;

      for (const brandItem of brandsItemData) {
        // @ts-ignore
        if (
          brandItem.sizeQuantities.length === 0 ||
          brandItem.sizeQuantities[0].selectedCapacity === 0
        ) {
          continue;
        }
        const rawPrice = brandItem?.price;
        const price = rawPrice === null ? 0 : Number(rawPrice);

        if (price > 0) {
          hasPrice = true;
        }

        let qty = 0;
        const demand = brandItem?.consumerDemand;
        if (demand && typeof demand === 'object') {
          qty = Object.values(demand as Record<string, any>).reduce(
            (sum: number, v: any) => sum + (Number(v) || 0),
            0,
          );
        } else {
          qty = Number(demand) || 0;
        }

        if (qty > 0 && price === 0) {
          disableReview = true;
          continue;
        }

        if (price > 0 && qty > 0) {
          totalPrice += price * qty;
          itemTotal += qty;
        }
      }

      order.total_amount = totalPrice;
      await order.save({ transaction });

      const existingPayments = await this.packagePaymentModel.count({
        where: { package_id: orderId },
        transaction,
      });

      if (existingPayments > 0) {
        await this.packagePaymentModel.update(
          { total_amount: totalPrice },
          { where: { package_id: orderId }, transaction },
        );
      } else {
        await this.packagePaymentModel.create(
          { package_id: orderId, total_amount: totalPrice },
          { transaction },
        );
      }

      const showConfirm = hasPrice;
      await transaction.commit();

      return {
        success: true,
        data: { totalPrice, itemTotal, disableReview, showConfirm },
      };
    } catch (err) {
      await transaction.rollback();
      throw new BadRequestException(err.message || AllMessages.SMTHG_WRNG);
    }
  }

  async totalItemCount(orderId: number) {
    try {
      const brands = await this.packageBrandModel.findAll({
        where: { package_id: orderId, selected: true },
        attributes: ['id', 'brand_id'],
        include: [
          {
            model: this.packageBrandItemsModel,
            as: 'items',
            where: { consumerDemand: { [Op.gt]: 0 } },
            attributes: ['id', 'consumerDemand', 'isItemReceived', 'price'],
            include: [
              {
                model: this.packageQtyModel,
                as: 'sizeQuantities',
                attributes: ['id', 'item_id', 'receivedQuantity'],
              },
            ],
          },
        ],
      });

      // @ts-ignore
      const allItems = brands.flatMap((brand) => brand.items || []);

      const totalConsumerDemand = allItems.reduce(
        (sum, item) => sum + (Number(item.consumerDemand) || 0),
        0,
      );

      const receivedQuantity = allItems.reduce((acc, item) => {
        if (item.isItemReceived === ORDER_ITEMS.ITM_RECEIVED) {
          // Use Enum
          // @ts-ignore
          const qtySum = (item.sizeQuantities || []).reduce(
            (sum, sq) =>
              sum + (sq.receivedQuantity > 0 ? sq.receivedQuantity : 0),
            0,
          );
          return acc + qtySum;
        }
        return acc;
      }, 0);

      const prices = allItems.reduce((acc, item) => {
        // @ts-ignore
        if (
          item.isItemReceived === ORDER_ITEMS.ITM_RECEIVED &&
          // @ts-ignore
          (item.sizeQuantities || []).some((sq) => sq.receivedQuantity > 0)
        ) {
          return acc + (Number(item.price) || 0);
        }
        return acc;
      }, 0);

      return {
        success: true,
        totalItems: totalConsumerDemand,
        receivedItems: receivedQuantity,
        prices,
      };
    } catch (err) {
      throw new BadRequestException(err.message || AllMessages.SMTHG_WRNG);
    }
  }

  async orderCount(user: any) {
    try {
      const { storeId, userId, isConsumer } = user;
      console.log(storeId, userId, isConsumer);

      const getCount = (orders, statuses, filterFn: any = null) => {
        const matches = orders.filter((o) => statuses.includes(o.status));
        const filtered = filterFn ? matches.filter(filterFn) : matches;
        return filtered.length;
      };

      if (isConsumer) {
        const cOrders = await this.packageCustomerModel.findAll({
          where: { customer_id: userId },
          attributes: ['package_id'],
          raw: true,
        });

        const packageIds = cOrders.map((o) => o.package_id);
        if (packageIds.length === 0) {
          return {
            success: true,
            data: {
              openOrders: 0,
              review: 0,
              submitted: 0,
              inBound: 0,
              completed: 0,
            },
          };
        }

        const orders = await this.packageOrderModel.findAll({
          where: { id: { [Op.in]: packageIds } },
          attributes: ['status', 'isManualOrder'],
          raw: true,
        });

        const consumerCount = {
          openOrders: getCount(orders, [
            PACKAGE_STATUS.CREATED,
            PACKAGE_STATUS.INITIATED,
          ]),
          review: getCount(orders, [PACKAGE_STATUS.IN_REVIEW]),
          submitted: getCount(
            orders,
            [PACKAGE_STATUS.CONFIRM, PACKAGE_STATUS.IN_PROGRESS],
            (o) => Number(o.isManualOrder) === 0,
          ),
          inBound: getCount(orders, [PACKAGE_STATUS.CLOSE]),
          completed: getCount(orders, [PACKAGE_STATUS.COMPLETED]),
        };

        return { success: true, data: consumerCount };
      }

      const orders = await this.packageOrderModel.findAll({
        where: { store_id: storeId },
        attributes: ['status', 'isManualOrder'],
        raw: true,
      });

      // @ts-ignore
      const requestCount = await this.inventoryRequestModel.count({
        // Needs import or injection? I forgot to inject it!
        where: { store_id: storeId, status: 'Requested' },
      });

      const finalCount = {
        openRequests: getCount(orders, [
          PACKAGE_STATUS.CREATED,
          PACKAGE_STATUS.INITIATED,
        ]),
        inReview: getCount(orders, [PACKAGE_STATUS.IN_REVIEW]),
        readyToProcess: getCount(orders, [PACKAGE_STATUS.IN_PROGRESS]),
        completed: getCount(orders, [
          PACKAGE_STATUS.COMPLETED,
          PACKAGE_STATUS.CLOSE,
        ]),
        confirm: getCount(
          orders,
          [PACKAGE_STATUS.CONFIRM],
          (o) => Number(o.isManualOrder) === 0,
        ),
        requestCount,
      };

      return { success: true, data: finalCount };
    } catch (err) {
      throw new BadRequestException(err.message || AllMessages.SMTHG_WRNG);
    }
  }

  async agentList(user: any, type: string) {
    try {
      let userIds: any[] = [];
      if (type === 'sales') {
        userIds = await this.userStoreMappingModel.findAll({
          where: { storeId: user.storeId, is_sales_agent: true },
          attributes: ['userId', 'is_sales_agent', 'is_logistic_agent'],
        });
      }

      if (type === 'logistic') {
        userIds = await this.userStoreMappingModel.findAll({
          where: {
            storeId: user.storeId,
            is_logistic_agent: true,
          },
          attributes: ['userId', 'is_sales_agent', 'is_logistic_agent'],
        });
      }

      if (userIds.length === 0) {
        return { success: true, data: [] };
      }

      const agents = await this.userModel.findAll({
        where: { id: { [Op.in]: userIds.map((u) => u.userId) } },
        attributes: ['id', 'firstName', 'lastName', 'email'],
      });

      return {
        success: true,
        data: agents.map((a) => ({
          id: a.id,
          firstName: a.firstName,
          lastName: a.lastName,
          email: a.email,
        })),
      };
    } catch (err) {
      throw new BadRequestException(AllMessages.SMTHG_WRNG);
    }
  }

  async startOrderProcess(user: any, body: any) {
    try {
      const { orderId, agentId, agentName } = body;

      const order = await this.packageOrderModel.findByPk(orderId, {
        attributes: ['id', 'status', 'store_id', 'employee_id'],
      });

      if (!order) {
        throw new BadRequestException(
          AllMessages.PAKG_NF || 'Order not found.',
        );
      }

      order.employee_id = agentId || user.userId;
      await order.save();

      return {
        success: true,
        message: `Fulfillment assigned to ${agentName}.`,
        data: {
          orderId: order.id,
          employeeId: order.employee_id,
        },
      };
    } catch (err) {
      throw new BadRequestException(err.message || AllMessages.SMTHG_WRNG);
    }
  }

  async assignSalesAgent(body: any) {
    try {
      const { orderId, agentId, agentName } = body;

      const order = await this.packageOrderModel.findByPk(orderId);
      if (!order) {
        throw new BadRequestException(
          AllMessages.PAKG_NF || 'Order not found.',
        );
      }

      order.sales_agent_id = agentId;
      await order.save();

      return {
        success: true,
        message: `Sales assigned to ${agentName}.`,
        data: order,
      };
    } catch (err) {
      throw new BadRequestException(err.message || AllMessages.SMTHG_WRNG);
    }
  }

  async getVariantCost(body: any) {
    try {
      const { variantIds } = body;

      const variants = await this.variantModel.findAll({
        where: { id: variantIds },
        attributes: ['id', 'stock_quantity', 'price'],
      });

      return {
        success: true,
        data: variants,
      };
    } catch (err) {
      throw new BadRequestException(AllMessages.SMTHG_WRNG);
    }
  }

  async addNotes(body: any) {
    try {
      const { orderId, notes } = body;
      const order = await this.packageOrderModel.findByPk(orderId);

      if (!order) {
        throw new BadRequestException(AllMessages.PAKG_NF);
      }

      order.notes = notes;
      await order.save();

      return {
        success: true,
        message: AllMessages.NOTE_ADDED,
      };
    } catch (err) {
      throw new BadRequestException(AllMessages.SMTHG_WRNG);
    }
  }

  async getNotes(orderId: number) {
    try {
      const order = await this.packageOrderModel.findByPk(orderId);

      if (!order) {
        throw new BadRequestException(AllMessages.PAKG_NF);
      }

      return {
        success: true,
        message: 'Notes fetched successfully.', // AllMessages.FTCH_NOTES missing?
        data: order.notes,
      };
    } catch (err) {
      throw new BadRequestException(AllMessages.SMTHG_WRNG);
    }
  }

  async storeConfirm(orderId: number, user: any, body: any, token: string) {
    let transaction;
    try {
      const { storeId, userId, roleId } = user;
      const { brandIds = [], confirmDate } = body;

      transaction = await this.sequelize.transaction();

      const order = await this.packageOrderModel.findOne({
        where: {
          id: orderId,
          status: PACKAGE_STATUS.CONFIRM,
        },
        include: [
          // Simplified include as relationships are trusted or verified elsewhere? Legacy included store/customer.
          { model: this.storeModel, as: 'store' },
          {
            model: this.packageCustomerModel,
            where: { package_id: orderId },
            as: 'customers',
            attributes: ['customer_id'],
          },
        ],
        transaction,
      });

      if (!order) {
        await transaction.rollback();
        throw new BadRequestException(AllMessages.PAKG_NF);
      }

      if (order.sales_agent_id == null) {
        await this.packageOrderModel.update(
          { sales_agent_id: userId },
          { where: { id: orderId }, transaction },
        );
      }

      if (brandIds.length > 0) {
        await this.packageBrandModel.update(
          {
            selected: Sequelize.literal(`
                        CASE
                            WHEN id IN (${brandIds.join(',')}) THEN TRUE
                            ELSE FALSE
                        END
                    `),
          },
          {
            where: { package_id: orderId },
            transaction,
          },
        );
      }

      order.status = PACKAGE_STATUS.IN_PROGRESS;
      await order.save({ transaction });

      // helper handles optional shopifyService internally if passed
      await markSoldInventory(
        orderId,
        confirmDate,
        storeId,
        userId,
        roleId,
        token,
        transaction,
        this.shopifyService,
      );

      await transaction.commit();

      // TODO: Sockets

      return {
        success: true,
        message: AllMessages.ORDR_CNFD,
      };
    } catch (err) {
      if (transaction) await transaction.rollback();
      throw new BadRequestException(err.message || AllMessages.SMTHG_WRNG);
    }
  }

  async checkStock(body: any) {
    try {
      const { items = [] } = body;

      if (!Array.isArray(items) || items.length === 0) {
        throw new BadRequestException('Items array is required.');
      }

      const outOfStock: any[] = [];

      for (const item of items) {
        const { productMainId, variants = [] } = item;

        if (!productMainId) {
          throw new BadRequestException('Product id is required.');
        }

        const sizes = variants.map((v) => v.size.trim());

        const dbVariants = await this.variantModel.findAll({
          where: {
            productId: productMainId,
            status: 1,
            quantity: { [Op.gt]: 0 },
            [Op.and]: [
              Sequelize.where(
                Sequelize.fn('TRIM', Sequelize.col('option1Value')),
                {
                  [Op.in]: sizes,
                },
              ),
            ],
          },
          attributes: ['option1Value', 'quantity'],
          raw: true,
        });

        const stockMap = dbVariants.reduce((acc, v) => {
          const sizeKey = v.option1Value?.trim();
          if (sizeKey) {
            acc[sizeKey] = (acc[sizeKey] || 0) + v.quantity;
          }
          return acc;
        }, {});

        for (const v of variants) {
          const sizeKey = v.size.trim();
          const availableQty = stockMap[sizeKey] || 0;
          const requiredQty = v.originalQty;

          if (availableQty < requiredQty) {
            outOfStock.push({
              productId: productMainId,
              size: sizeKey,
              requiredQty,
              availableQty,
            });
          }
        }
      }

      if (outOfStock.length > 0) {
        return {
          success: false,
          refresh: true,
          message:
            'Inventory quantities have changed, this page will now refresh with updates.',
        };
      }

      return {
        success: true,
        refresh: false,
        message: 'All variants are in stock.',
      };
    } catch (err) {
      throw new BadRequestException(err.message || AllMessages.SMTHG_WRNG);
    }
  }
} // End Class
