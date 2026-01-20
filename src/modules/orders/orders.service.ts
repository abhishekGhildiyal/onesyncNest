import { BadRequestException, Injectable } from '@nestjs/common';
import { Op } from 'sequelize';
import { Sequelize } from 'sequelize-typescript';
import type { getUser } from 'src/common/interfaces/common/getUser';
import { ORDER_ITEMS, PACKAGE_STATUS, PAYMENT_STATUS } from '../../common/constants/enum';
import { AllMessages } from '../../common/constants/messages';
import { generateOrderId } from '../../common/helpers/order-generator.helper';
import { sortSizes } from '../../common/helpers/sort-sizes.helper';
import { MailService } from '../mail/mail.service';

import { ManualOrderHelperService } from 'src/common/helpers/create-manual-order.helper';
import { MarkInventorySold } from 'src/common/helpers/sold-inventory.helper';
import { PackageRepository } from 'src/db/repository/package.repository';
import { ProductRepository } from 'src/db/repository/product.repository';
import { StoreRepository } from 'src/db/repository/store.repository';
import { UserRepository } from 'src/db/repository/user.repository';
import { TemplatesSlug } from '../mail/mail.constants';
import { ShopifyService } from '../shopify/shopify.service';
import { SocketGateway } from '../socket/socket.gateway';
import * as DTO from './dto/orders.dto';

@Injectable()
export class OrdersService {
  constructor(
    private readonly pkgRepo: PackageRepository,
    private readonly userRepo: UserRepository,
    private readonly productRepo: ProductRepository,
    private readonly storeRepo: StoreRepository,

    private socketGateway: SocketGateway,
    private readonly mailService: MailService,
    private readonly sequelize: Sequelize,
    private readonly shopifyService: ShopifyService,

    private readonly createManualOrderService: ManualOrderHelperService,
    private readonly MarkInventorySold: MarkInventorySold,
  ) {}

  async getPackageBrands(user: any, params: any, query: any) {
    try {
      const { orderId } = params;
      const { userId, roleName } = user;
      const isAccess = query.access === 'true';

      if (roleName === 'Consumer') {
        const linked = isAccess
          ? await this.pkgRepo.accessPackageCustomerModel.findOne({
              where: { package_id: orderId, customer_id: userId },
            })
          : await this.pkgRepo.packageCustomerModel.findOne({
              where: { package_id: orderId, customer_id: userId },
            });
        if (!linked) throw new BadRequestException(AllMessages.PAKG_NF);
      }

      const OrderModelRef = (isAccess ? this.pkgRepo.accessPackageOrderModel : this.pkgRepo.packageOrderModel) as any;
      const BrandModelRef = (isAccess ? this.pkgRepo.accessPackageBrandModel : this.pkgRepo.packageBrandModel) as any;

      const packageOrder = await OrderModelRef.findByPk(orderId);
      if (!packageOrder) throw new BadRequestException(AllMessages.PAKG_NF);

      let salesAgent, logisticsAgent;
      if (packageOrder.sales_agent_id) {
        salesAgent = await this.userRepo.userModel.findOne({
          where: { id: packageOrder.sales_agent_id },
          attributes: ['id', 'firstName', 'lastName', 'email'],
        });
      }
      if (packageOrder.employee_id) {
        logisticsAgent = await this.userRepo.userModel.findOne({
          where: { id: packageOrder.employee_id },
          attributes: ['id', 'firstName', 'lastName', 'email'],
        });
      }

      if (roleName === 'Consumer') {
        if (packageOrder.isManualOrder && packageOrder.status === PACKAGE_STATUS.IN_PROGRESS) {
          throw new BadRequestException(AllMessages.PAKG_NF);
        }
      } else if (packageOrder.status === PACKAGE_STATUS.DRAFT) {
        throw new BadRequestException(AllMessages.PAKG_NF);
      }

      let brandWhere: any = { package_id: packageOrder.id };
      if (!isAccess) {
        if (packageOrder.status === PACKAGE_STATUS.CONFIRM && packageOrder.isManualOrder) {
          // fetch all brands
        } else if (packageOrder.status !== PACKAGE_STATUS.SUBMITTED && packageOrder.status !== PACKAGE_STATUS.DRAFT) {
          brandWhere.selected = true;
        }
      }

      const packageBrands = await BrandModelRef.findAll({
        where: brandWhere,
        attributes: ['brand_id', 'id'],
        include: [
          {
            model: this.productRepo.brandModel,
            as: 'brandData',
            attributes: ['brandName', 'id'],
          },
        ],
      });

      const brandIds = packageBrands.map((b) => b.id);
      const pkgItemsModelRef: any = isAccess
        ? this.pkgRepo.accessPackageBrandItemsModel
        : this.pkgRepo.packageBrandItemsModel;

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
        .sort((a, b) => a.brandName.localeCompare(b.brandName, 'en', { sensitivity: 'base' }));

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
      const consumerStore = await this.pkgRepo.accessPackageCustomerModel.findAll({
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
      const { rows: orders, count: total } = await this.pkgRepo.accessPackageOrderModel.findAndCountAll({
        where: whereCond,
        limit: Number(limit),
        offset: (Number(page) - 1) * Number(limit),
        order: [['createdAt', 'DESC']],
        include: [
          {
            model: this.storeRepo.storeModel,
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
      const consumerStore = await this.pkgRepo.packageCustomerModel.findAll({
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
          [Op.and]: [{ status: PACKAGE_STATUS.IN_PROGRESS }, { isManualOrder: true }],
        },
      };
      if (status) {
        switch (status) {
          case PACKAGE_STATUS.CREATED:
            whereCond.status = {
              [Op.in]: [PACKAGE_STATUS.CREATED, PACKAGE_STATUS.SUBMITTED, PACKAGE_STATUS.INITIATED],
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
      const { rows: orders, count: total } = await this.pkgRepo.packageOrderModel.findAndCountAll({
        where: whereCond,
        limit: Number(limit),
        offset: (Number(page) - 1) * Number(limit),
        order: [['updatedAt', 'DESC']],
        include: [
          {
            model: this.storeRepo.storeModel,
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

  /**
   * @description get store orders
   * @param user
   * @param body
   * @returns
   */
  async storeOrders(user: getUser, body: any) {
    try {
      const { storeId } = user;
      const {
        status,
        page = 1,
        limit = 10,
        customerId,
        paymentStatus,
        salesAgentId,
        logisticAgentId,
        search,
        sDate,
        eDate,
      } = body;

      const Nlimit = Number(limit);
      const offset = (Number(page) - 1) * Nlimit;

      /**
       |----------------------------------------
       | ACCESS PACKAGE ORDERS
       |----------------------------------------
       */
      if (status === PACKAGE_STATUS.ACCESS) {
        const { rows, count } = await this.pkgRepo.accessPackageOrderModel.findAndCountAll({
          where: {
            store_id: storeId,
            status: { [Op.ne]: PACKAGE_STATUS.DRAFT },
          },
          distinct: true,
          limit: Nlimit,
          offset,
          order: [['createdAt', 'DESC']],
          attributes: ['packageName', 'id', 'createdAt', 'showPrices', 'isManualOrder'],
          include: [
            {
              model: this.pkgRepo.accessPackageCustomerModel,
              as: 'customers',
              attributes: ['customer_id'],
            },
          ],
        });

        const data = rows.map((order) => {
          const json: any = order.toJSON();
          return {
            ...json,
            customerCount: json.customers?.length || 0,
          };
        });

        return {
          success: true,
          data,
          pagination: {
            total: count,
            totalPages: Math.ceil(count / Nlimit),
            currentPage: Number(page),
            perPage: Nlimit,
          },
        };
      }

      /**
       |----------------------------------------
       | REGULAR PACKAGE ORDERS
       |----------------------------------------
       */
      const whereCond: any = {
        store_id: storeId,
        status: { [Op.ne]: PACKAGE_STATUS.DRAFT },
      };

      if (search) {
        whereCond.order_id = { [Op.like]: `%${search}%` };
      }

      if (salesAgentId) whereCond.sales_agent_id = salesAgentId;
      if (logisticAgentId) whereCond.employee_id = logisticAgentId;

      if (status) {
        switch (status) {
          case PACKAGE_STATUS.CREATED:
            whereCond.status = {
              [Op.in]: [PACKAGE_STATUS.CREATED, PACKAGE_STATUS.SUBMITTED, PACKAGE_STATUS.INITIATED],
            };
            break;

          case PACKAGE_STATUS.IN_PROGRESS:
            whereCond[Op.or] = [{ status: PACKAGE_STATUS.IN_PROGRESS }];
            break;

          case PACKAGE_STATUS.CONFIRM:
            whereCond[Op.or] = [{ status: PACKAGE_STATUS.CONFIRM, isManualOrder: false }];
            break;

          case PACKAGE_STATUS.COMPLETED:
            whereCond[Op.or] = [{ status: PACKAGE_STATUS.COMPLETED }, { status: PACKAGE_STATUS.CLOSE }];
            break;

          default:
            whereCond.status = status;
        }
      }

      /**
       |----------------------------------------
       | PAYMENT FILTER
       |----------------------------------------
       */
      let wherePayCond: any = {};
      let required = false;

      if (paymentStatus === PAYMENT_STATUS.IN_PROCESS) {
        whereCond.paymentStatus = PAYMENT_STATUS.PENDING;
        wherePayCond.received_amount = { [Op.gt]: 0 };
        required = true;
      }

      if (paymentStatus === PAYMENT_STATUS.PENDING) {
        whereCond.paymentStatus = PAYMENT_STATUS.PENDING;
        wherePayCond.received_amount = { [Op.or]: [0, null] };
        required = true;
      }

      if (paymentStatus === PAYMENT_STATUS.CONFIRMED) {
        whereCond.paymentStatus = PAYMENT_STATUS.CONFIRMED;
        wherePayCond.payment_method = { [Op.ne]: null };
      }

      if (sDate && eDate) {
        whereCond.createdAt = {
          [Op.between]: [new Date(sDate), new Date(eDate)],
        };
      }

      /**
       |----------------------------------------
       | CUSTOMER FILTER
       |----------------------------------------
       */
      const whereCustCond: any = {};
      if (customerId) whereCustCond.customer_id = customerId;

      const { rows, count } = await this.pkgRepo.packageOrderModel.findAndCountAll({
        where: whereCond,
        limit: Nlimit,
        offset,
        order: [['createdAt', 'DESC']],
        distinct: true,
        raw: true,
        nest: true,
        include: [
          {
            model: this.pkgRepo.packageCustomerModel,
            as: 'customers',
            where: whereCustCond,
            required: !!customerId,
            include: [
              {
                model: this.userRepo.userModel,
                as: 'customer',
                attributes: ['id', 'firstName', 'lastName'],
              },
            ],
          },
          {
            model: this.pkgRepo.packagePaymentModel,
            as: 'payment',
            where: wherePayCond,
            required,
          },
        ],
      });

      /**
       |----------------------------------------
       | GROUP PAYMENTS
       |----------------------------------------
       */

      const grouped: Record<number, any> = {};

      for (const row of rows) {
        if (!grouped[row.id]) grouped[row.id] = { ...row, payments: [] };

        // Payment can be a single object or an array depending on query/raw
        const payment = row.payment as any;
        if (Array.isArray(payment)) {
          for (const p of payment) {
            if (p?.payment_date) grouped[row.id].payments.push(p);
          }
        } else if (payment?.payment_date) {
          grouped[row.id].payments.push(payment);
        }
      }

      const data = Object.values(grouped).map((order: any) => {
        const totalReceived = order.payments?.reduce((sum, p) => sum + (p.received_amount || 0), 0) || 0;

        return {
          ...order,
          totalReceived,
          pending: (order.total_amount || 0) - totalReceived,
        };
      });

      return {
        success: true,
        data,
        pagination: {
          total: count,
          totalPages: Math.ceil(count / Nlimit),
          currentPage: Number(page),
          perPage: Nlimit,
        },
      };
    } catch (err) {
      console.log('err', err);
      throw new BadRequestException('Something went wrong');
    }
  }

  async getPackageBrandProducts(params: any, query: any) {
    try {
      const { orderId, brandId } = params;
      const isAccess = query.access === 'true';

      const OrderModel: any = isAccess ? this.pkgRepo.accessPackageOrderModel : this.pkgRepo.packageOrderModel;
      const BrandItemsModel: any = isAccess
        ? this.pkgRepo.accessPackageBrandItemsModel
        : this.pkgRepo.packageBrandItemsModel;
      const BrandItemsCapacityModel: any = isAccess
        ? this.pkgRepo.accessPackageBrandItemsCapacityModel
        : this.pkgRepo.packageBrandItemsCapacityModel;
      const BrandItemsQtyModel: any = isAccess
        ? this.pkgRepo.accessPackageBrandItemsQtyModel
        : this.pkgRepo.packageBrandItemsQtyModel;

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
          model: this.productRepo.productListModel,
          as: 'products',
          attributes: ['product_id', 'itemName', 'image', 'skuNumber'],
          include: [
            {
              model: this.productRepo.brandModel,
              as: 'brandData',
              attributes: ['brandName'],
            },
            ...(isAccess
              ? [
                  {
                    model: this.productRepo.variantModel,
                    where: { status: 1, quantity: { [Op.gt]: 0 } },
                    as: 'variants',
                    attributes: ['id', 'option1Value', 'quantity', 'price', 'accountType', 'cost', 'payout'],
                  },
                ]
              : []),
          ],
        },
      ];

      if (!isAccess) {
        includeArray.push(
          {
            model: this.pkgRepo.packageBrandItemsCapacityModel,
            as: 'capacities',
            attributes: ['id', 'variant_id', 'item_id', 'maxCapacity', 'selectedCapacity'],
            include: [
              {
                model: this.productRepo.variantModel,
                where: { status: 1, quantity: { [Op.gt]: 0 } },
                as: 'variant',
                attributes: ['id', 'option1Value', 'quantity', 'price', 'accountType', 'cost', 'payout'],
              },
            ],
          },
          {
            model: this.pkgRepo.packageBrandItemsQtyModel,
            as: 'sizeQuantities',
            attributes: ['variant_size', 'item_id', 'maxCapacity', 'selectedCapacity', 'shortage', 'receivedQuantity'],
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
          : (item.capacities && item.capacities.length > 0) || (item.sizeQuantities && item.sizeQuantities.length > 0);
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
              variant.accountType === '1' ? variant.cost || 0 : variant.accountType === '0' ? variant.payout || 0 : 0;

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
            sizeAndQuantity[size].receivedQuantity += qty.receivedQuantity !== null ? qty.receivedQuantity : selected;
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
            showDemand ? entry.demand > 0 : !isInitiated ? entry.quantity > 0 : entry.quantity > 0 && entry.demand > 0,
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

      result.sort((a, b) => (a.itemName || '').toLowerCase().localeCompare((b.itemName || '').toLowerCase()));
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

  /**
   * @description Get manual order products whose selected quantity >= 0
   */
  async manualProducts(params: DTO.ParamOrderIdBrandIdDto) {
    try {
      const { orderId, brandId } = params;

      const packageOrderData = await this.pkgRepo.packageOrderModel.findByPk(orderId, {
        attributes: ['status'],
      });
      if (!packageOrderData) throw new BadRequestException('Package order not found');

      const includeArray = [
        {
          model: this.productRepo.productListModel,
          as: 'products',
          attributes: ['product_id', 'itemName', 'image', 'skuNumber'],
          include: [
            {
              model: this.productRepo.brandModel,
              as: 'brandData',
              attributes: ['brandName'],
            },
          ],
        },
        {
          model: this.pkgRepo.packageBrandItemsCapacityModel,
          as: 'capacities',
          attributes: ['id', 'variant_id', 'item_id', 'maxCapacity', 'selectedCapacity'],
          include: [
            {
              model: this.productRepo.variantModel,
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
          model: this.pkgRepo.packageBrandItemsQtyModel,
          as: 'sizeQuantities',
          attributes: ['variant_size', 'item_id', 'maxCapacity', 'selectedCapacity', 'shortage', 'receivedQuantity'],
        },
      ];

      // Fetch brand items with product, capacities, and qty
      const packageOrder: any = await this.pkgRepo.packageBrandItemsModel.findAll({
        where: { packageBrand_id: brandId },
        include: includeArray,
      });

      if (!packageOrder || packageOrder.length === 0) throw new BadRequestException(AllMessages.PAKG_NF);

      const result: any[] = [];

      for (const item of packageOrder) {
        const product = item.products;
        if (!product) continue;

        const brandName = product?.brandData?.brandName || 'Unknown';

        const sizeAndQuantity: any = {};
        const consumerDemand = {};
        const variants: any[] = [];

        // Build variants and stock from capacities
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

          // Initialize object if not exists
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

        // Build consumer demand from sizeQuantities
        for (const qty of item.sizeQuantities || []) {
          const size = (qty.variant_size || '').trim();
          if (!size) continue;

          const selected = qty.selectedCapacity || 0;

          if (!sizeAndQuantity[size]) {
            sizeAndQuantity[size] = {
              quantity: 0,
              demand: 0,
              shortage: 0,
              receivedQuantity: 0,
              totalCost: 0,
            };
          }
          sizeAndQuantity[size].demand += selected;
          sizeAndQuantity[size].shortage += qty.shortage || 0;
          sizeAndQuantity[size].receivedQuantity += qty.receivedQuantity ?? selected;

          consumerDemand[size] = selected;
        }

        const filteredVariants = variants.filter((v) => v.stock_quantity > 0);

        const sortedVariants = sortSizes(variants);

        // Keep size if either stock > 0 OR consumerDemand > 0
        const sortedSizeAndQuantity = sortSizes(
          Object.entries(sizeAndQuantity).filter(([, obj]) => {
            const o = obj as any;
            return o.quantity > 0 || o.demand > 0;
          }),
        ).map(([size, obj]) => {
          const avgCost = obj.quantity > 0 ? obj.totalCost / obj.quantity : 0;
          return {
            size,
            quantity: obj.quantity,
            demand: obj.demand,
            shortage: obj.shortage,
            receivedQuantity: obj.receivedQuantity,
            costPrice: avgCost,
          };
        });

        // if (sortedVariants.length === 0 && sortedSizeAndQuantity.length === 0) continue; // skip product with all zero qty

        result.push({
          name: product?.itemName || 'Unnamed',
          productMainId: product?.product_id,
          product_id: item.id,
          itemName: product?.itemName,
          image: product?.image || null,
          skuNumber: product?.skuNumber,
          brand_id: item.packageBrand_id || item.id,
          brandData: { brandName },
          variants: sortedVariants,
          sizeAndQuantity: sortedSizeAndQuantity,
          price: item.price,
          isItemReceived: item?.isItemReceived || null,
          consumerDemand,
        });
      }

      result.sort((a, b) => (a.itemName || '').toLowerCase().localeCompare((b.itemName || '').toLowerCase()));

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
    const t = await this.sequelize.transaction();
    try {
      const { brandId, items = [], packageOrderId, isSearch } = body;

      let itemTotalQuantity = 0;
      const updates: Promise<any>[] = [];
      for (const item of items) {
        const { itemId, totalQuantity, variants = [] } = item;
        if (!itemId) continue;
        itemTotalQuantity += totalQuantity;

        updates.push(
          this.pkgRepo.packageBrandItemsModel.update(
            { consumerDemand: totalQuantity },
            { where: { id: itemId }, transaction: t },
          ),
        );
        for (const variant of variants) {
          if (!variant || variant.size == null) continue;
          updates.push(
            this.pkgRepo.packageBrandItemsQtyModel.update(
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
        await this.pkgRepo.packageBrandModel.update(
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
      if (t) await t.rollback();
      throw new BadRequestException(AllMessages.SMTHG_WRNG);
    }
  }

  async updateAccessVarientQuantity(body: any) {
    try {
      const { items } = body;
      for (const item of items || []) {
        const { itemId, totalQuantity, variants } = item;
        await this.pkgRepo.packageBrandItemsModel.update({ consumerDemand: totalQuantity }, { where: { id: itemId } });
        for (const variant of variants || []) {
          const { size, quantity } = variant;
          if (size == null) continue;
          await this.pkgRepo.packageBrandItemsQtyModel.update(
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

  async setItemPrice(user: getUser, body: DTO.SetItemPriceDto) {
    const t = await this.sequelize.transaction();
    try {
      const { packageOrderId, packageBrandId, prices = [], items = [], isSearch } = body;
      const { userId } = user;

      const existingOrder: any = await this.pkgRepo.packageOrderModel.findOne({
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
        include: [{ model: this.pkgRepo.packageCustomerModel, as: 'customers' }],
        transaction: t,
      });

      if (!existingOrder) {
        if (t) await t.rollback();
        throw new BadRequestException(AllMessages.INITD_REQ);
      }
      const customer_id = existingOrder.customers.map((c) => c.customer_id);

      if (existingOrder.sales_agent_id == null) {
        await this.pkgRepo.packageOrderModel.update(
          { sales_agent_id: userId },
          { where: { id: packageOrderId }, transaction: t },
        );
      } else if (existingOrder.sales_agent_id !== userId) {
        if (t) await t.rollback();
        throw new BadRequestException('You are not authorized to update this package.');
      }

      // Update prices
      if (prices.length) {
        await Promise.all(
          prices.map(({ price, packageBrandItemId }) =>
            this.pkgRepo.packageBrandItemsModel.update(
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

      // Prepare item and variant updates
      let itemTotalQuantity = 0;
      const itemUpdates: Promise<any>[] = [];
      const variantUpdates: Promise<any>[] = [];

      for (const item of items) {
        const { itemId, totalQuantity, variants = [] } = item;
        if (!itemId) continue;
        itemTotalQuantity += totalQuantity;

        itemUpdates.push(
          this.pkgRepo.packageBrandItemsModel.update(
            { consumerDemand: totalQuantity },
            { where: { id: itemId }, transaction: t },
          ),
        );

        for (const variant of variants) {
          if (!variant?.size) continue;
          variantUpdates.push(
            this.pkgRepo.packageBrandItemsQtyModel.update(
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
        await this.pkgRepo.packageBrandModel.update(
          { selected: itemTotalQuantity > 0 },
          {
            where: { package_id: packageOrderId, id: packageBrandId },
            transaction: t,
          },
        );
      }

      await Promise.all([...itemUpdates, ...variantUpdates]);
      await t.commit();

      // Socket to send item updates -----------------------
      if (customer_id) {
        this.socketGateway.server.emit(`itemUpdated-${customer_id[0]}`, {
          packageOrderId,
        });
      }
      this.socketGateway.server.emit(`updateQty-${existingOrder?.store_id}-${packageOrderId}`);

      return { success: true, message: AllMessages.ITM_PRC_UPDT };
    } catch (err) {
      if (t) await t.rollback();
      console.error('❌ setItemPrice error:', err);
      throw new BadRequestException(AllMessages.SMTHG_WRNG);
    }
  }

  async saveOrderAsDraft(user: any, body: any) {
    const t = await (this.pkgRepo.packageOrderModel.sequelize as any).transaction();
    try {
      const { packageId, brands = [] } = body;
      const { userId } = user;

      const accessOrder = await this.pkgRepo.accessPackageOrderModel.findByPk(packageId, {
        transaction: t,
      });
      if (!accessOrder) throw new BadRequestException(AllMessages.PAKG_NF);

      const store = await this.storeRepo.storeModel.findByPk(accessOrder.store_id, {
        transaction: t,
      });
      if (!store) throw new BadRequestException('Store not found.');

      const orderIdStr = await generateOrderId({
        storeId: store.store_id,
        prefix: store.store_code,
        model: this.pkgRepo.packageOrderModel as any,
        transaction: t,
      });

      const pkg = await this.pkgRepo.packageOrderModel.create(
        {
          packageName: accessOrder.packageName,
          user_id: accessOrder.user_id,
          order_id: orderIdStr,
          store_id: accessOrder.store_id,
          status: PACKAGE_STATUS.DRAFT,
          paymentStatus: 'Pending',
          shipmentStatus: false,
        } as any,
        { transaction: t },
      );

      await this.pkgRepo.packageCustomerModel.create({ package_id: pkg.id, customer_id: userId } as any, {
        transaction: t,
      });

      const brandIds = brands.map((b: any) => b.brand_id).filter(Boolean);
      const validBrands = await this.productRepo.brandModel.findAll({
        where: { id: brandIds },
        transaction: t,
      });
      const brandIdSet = new Set(validBrands.map((b) => b.id));

      const brandPayload = brands
        .filter((b: any) => brandIdSet.has(b.brand_id) && b.items?.length > 0)
        .map((b: any) => ({ package_id: pkg.id, brand_id: b.brand_id }));

      if (brandPayload.length > 0) {
        const createdBrands = await this.pkgRepo.packageBrandModel.bulkCreate(brandPayload, {
          transaction: t,
          returning: true,
        });
        const brandIdToPkgBrandId = new Map(createdBrands.map((b) => [b.brand_id, b.id]));

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

        const createdItems = await this.pkgRepo.packageBrandItemsModel.bulkCreate(
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
          await this.pkgRepo.packageBrandItemsCapacityModel.bulkCreate(finalVariantInsert, {
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
          await this.pkgRepo.packageBrandItemsQtyModel.bulkCreate(finalSizeInsert, {
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
      if (t) await t.rollback();
      throw new BadRequestException(AllMessages.SMTHG_WRNG);
    }
  }

  async createOrder(user: any, body: any) {
    const t = await (this.pkgRepo.packageOrderModel.sequelize as any).transaction();
    try {
      const { accessPackageId, emails = [], brands = [], date, customerDetail } = body;
      const { userId } = user;

      const packageOrder = await this.createManualOrderService.createManualOrderHelper({
        accessPackageId,
        userId,
        emails,
        brands,
        date,
        customerDetail,
        transaction: t,
      });

      await t.commit();
      return packageOrder;
    } catch (err) {
      if (t) await t.rollback();
      throw new BadRequestException(AllMessages.SMTHG_WRNG);
    }
  }

  /**
   * @description Manual order by admin
   */
  async createManualOrder(user: getUser, body: DTO.CreateManualOrderDto) {
    const t = await this.sequelize.transaction();
    try {
      const { userId } = user;
      const { packageId, emails = [], brandData = [], date = '', customerDetail } = body;

      const manualOrder = await this.createManualOrderService.createManualOrderHelper({
        accessPackageId: String(packageId),
        userId,
        emails,
        brands: brandData,
        date,
        customerDetail,
        transaction: t,
      });

      await t.commit();

      return {
        success: true,
        message: AllMessages.MNUL_ODR,
        data: {
          package_id: manualOrder.id,
          order_id: manualOrder.order_id,
        },
      };
    } catch (err) {
      console.error('❌ orderCount error:', err);
      if (t) await t.rollback();
      throw new BadRequestException(AllMessages.SMTHG_WRNG);
    }
  }

  /**
   * @description Initiate order for admin
   */
  async initiateOrder(param: DTO.OrderIdParamDto, user: getUser) {
    const t = await this.sequelize.transaction();
    const { orderId } = param;

    try {
      const order = await this.pkgRepo.packageOrderModel.findByPk(orderId, {
        attributes: ['status', 'store_id', 'employee_id', 'sales_agent_id'],
        transaction: t,
        lock: t.LOCK.UPDATE,
      });
      if (!order) throw new BadRequestException(AllMessages.PAKG_NF);

      if (order.sales_agent_id != null && order.sales_agent_id !== user.userId) {
        throw new BadRequestException('You are not authorized to initiate this package.');
      }
      if (order.status === PACKAGE_STATUS.INITIATED) throw new BadRequestException('Package is already initiated.');

      if (order.status !== PACKAGE_STATUS.CREATED) {
        throw new BadRequestException("Package status must be 'CREATED' or 'SUBMITTED' to initiate.");
      }

      // ✅ Update package status & Assign initiator as sales agent
      await this.pkgRepo.packageOrderModel.update(
        {
          status: PACKAGE_STATUS.INITIATED,
          sales_agent_id: order.sales_agent_id || user.userId,
        },
        { where: { id: orderId }, transaction: t },
      );

      await t.commit();
      this.socketGateway.server.emit(`initiated-${orderId}`);
      return { success: true, message: AllMessages.PKG_INITD_SUCCSS };
    } catch (err) {
      if (t) await t.rollback();
      throw new BadRequestException(AllMessages.SMTHG_WRNG);
    }
  }

  /**
   * @description Mark order for Review and save price step 3
   */
  async markReview(orderId: DTO.OrderIdParamDto, user: getUser) {
    const t = await this.sequelize.transaction();
    try {
      const existingOrder: any = await this.pkgRepo.packageOrderModel.findOne({
        where: { id: orderId, status: PACKAGE_STATUS.INITIATED },
        include: [
          { model: this.storeRepo.storeModel, as: 'store' },
          {
            model: this.pkgRepo.packageCustomerModel,
            where: { package_id: orderId },
            as: 'customers',
            attributes: ['customer_id'],
            include: [
              {
                model: this.userRepo.userModel,
                as: 'customer',
                attributes: ['firstName', 'lastName', 'email'],
              },
            ],
          },
        ],
        transaction: t,
      });

      if (!existingOrder) throw new BadRequestException("Package status must be 'INITIATED' to send it for Review.");
      if (existingOrder.sales_agent_id != null && existingOrder.sales_agent_id !== user.userId) {
        throw new BadRequestException('You are not authorized to mark this package for Review.');
      }

      existingOrder.status = PACKAGE_STATUS.IN_REVIEW;
      await existingOrder.save({ transaction: t });

      const recipientEmails = new Set();
      existingOrder.customers?.forEach((cust) => {
        if (cust.customer?.email) {
          recipientEmails.add(cust.customer.email);
        }
      });
      const customer = existingOrder.customers?.[0];
      const customerId = customer?.customer_id;

      // Prepare email content
      const { html, subject } = this.mailService.getPopulatedTemplate(TemplatesSlug.ReviewOrderConsumer, {
        project: process.env.PROJECT_NAME,
        orderNo: existingOrder.order_id,
        storeName: existingOrder.store.store_name,
        link: `${process.env.FRONTEND_URL}onesync.test/consumer-orders/open/${existingOrder.id}`,
        supportEmail: process.env.SUPPORT_EMAIL,
        frontendURL: process.env.FRONTEND_URL,
        storeLogo: existingOrder?.store?.store_icon,
        oneSyncLogo: process.env.ONE_SYNC_LOGO,
      });

      await t.commit();

      //   sockets-------------
      this.socketGateway.server.emit(`review-${customerId}`); // for listing
      this.socketGateway.server.emit(`openToReview-${orderId}`, {
        storeName: existingOrder?.store?.store_name,
      }); // for popup.
      this.socketGateway.server.emit(`statusChanged-${customerId}`); // for sidebar count
      this.socketGateway.server.emit(`statusChanged-${existingOrder?.store_id}`);

      // 📨 Send email in background
      setImmediate(async () => {
        Promise.all(
          Array.from(recipientEmails).map((email) =>
            this.mailService.sendMail(String(email), html, subject).catch((err) => {
              console.error(`❌ Email send failed for ${email}:`, err);
            }),
          ),
        );
      });

      this.socketGateway.server.emit(`inReview-${orderId}`, {
        message: 'Package marked for review',
      });
      return { success: true, message: AllMessages.PKG_REVW_SUCCSS };
    } catch (err) {
      if (t) await t.rollback();
      throw new BadRequestException(AllMessages.SMTHG_WRNG);
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

      const order = await this.pkgRepo.packageOrderModel.findByPk(orderId, {
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
        const role = await this.userRepo.roleModel.findOne({
          where: { roleName: user.roleName },
        });
        roleId = role ? role.id : 0;
      }

      await this.MarkInventorySold.markSoldInventory(
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
      this.socketGateway.server.emit(`statusChanged-${store_id}`, {});
      this.socketGateway.server.emit(`statusChanged-${validUserId}`, {});

      // Send confirmation emails in background
      setImmediate(async () => {
        try {
          const packageOrder = await this.pkgRepo.packageOrderModel.findByPk(orderId, {
            include: [
              { model: this.storeRepo.storeModel, as: 'store' },
              {
                model: this.pkgRepo.packageCustomerModel,
                as: 'customers',
                include: [{ model: this.userRepo.userModel, as: 'customer' }],
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
                  customerName: `${customer.customer.firstName || ''} ${customer.customer.lastName || ''}`.trim(),
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
      throw new BadRequestException(AllMessages.SMTHG_WRNG);
    }
  }

  async updateOrderBrands(body: any) {
    try {
      const { packageOrderId, brandIds = [] } = body;
      const packageOrder = await this.pkgRepo.packageOrderModel.findByPk(packageOrderId);
      if (!packageOrder) throw new BadRequestException(AllMessages.PAKG_NF);

      await this.pkgRepo.packageBrandModel.update(
        { selected: true },
        { where: { package_id: packageOrderId, id: { [Op.in]: brandIds } } },
      );
      return { success: true, message: AllMessages.ORDR_UPDTD };
    } catch (err) {
      throw new BadRequestException(AllMessages.SMTHG_WRNG);
    }
  }

  /**
   * @description All items count and price in order
   */
  async getAllOrderItemsPrice(param: DTO.OrderIdParamDto) {
    try {
      const { orderId } = param;
      const orderItems = await this.pkgRepo.packageBrandItemsModel.findAll({
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
      throw new BadRequestException(AllMessages.SMTHG_WRNG);
    }
  }

  async itemTotalPrice(body: any) {
    const transaction = await this.sequelize.transaction();
    try {
      const { orderId, brandIds = [] } = body;

      const order = await this.pkgRepo.packageOrderModel.findOne({
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

      const brandsItemData = await this.pkgRepo.packageBrandItemsModel.findAll({
        where: { packageBrand_id: { [Op.in]: brandIds } },
        include: [
          {
            model: this.pkgRepo.packageBrandItemsQtyModel,
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
        if (
          !brandItem.sizeQuantities ||
          brandItem.sizeQuantities?.length === 0 ||
          brandItem.sizeQuantities?.[0]?.selectedCapacity === 0
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
          qty = Object.values(demand as Record<string, any>).reduce((sum: number, v: any) => sum + (Number(v) || 0), 0);
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

      const existingPayments = await this.pkgRepo.packagePaymentModel.count({
        where: { package_id: orderId },
        transaction,
      });

      if (existingPayments > 0) {
        await this.pkgRepo.packagePaymentModel.update(
          { total_amount: totalPrice },
          { where: { package_id: orderId }, transaction },
        );
      } else {
        await this.pkgRepo.packagePaymentModel.create(
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
      throw new BadRequestException(AllMessages.SMTHG_WRNG);
    }
  }

  async totalItemCount(orderId: number) {
    try {
      const brands = await this.pkgRepo.packageBrandModel.findAll({
        where: { package_id: orderId, selected: true },
        attributes: ['id', 'brand_id'],
        include: [
          {
            model: this.pkgRepo.packageBrandItemsModel,
            as: 'items',
            where: { consumerDemand: { [Op.gt]: 0 } },
            attributes: ['id', 'consumerDemand', 'isItemReceived', 'price'],
            include: [
              {
                model: this.pkgRepo.packageBrandItemsQtyModel,
                as: 'sizeQuantities',
                attributes: ['id', 'item_id', 'receivedQuantity'],
              },
            ],
          },
        ],
      });

      const allItems = brands.flatMap((brand) => brand.items || []);

      const totalConsumerDemand = allItems.reduce((sum, item) => sum + (Number(item.consumerDemand) || 0), 0);

      const receivedQuantity = allItems.reduce((acc, item) => {
        if (item.isItemReceived === ORDER_ITEMS.ITM_RECEIVED) {
          // Use Enum
          const qtySum = (item.sizeQuantities || []).reduce(
            (sum, sq) => sum + (sq.receivedQuantity > 0 ? sq.receivedQuantity : 0),
            0,
          );
          return acc + qtySum;
        }
        return acc;
      }, 0);

      const prices = allItems.reduce((acc, item) => {
        if (
          item.isItemReceived === ORDER_ITEMS.ITM_RECEIVED &&
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
      throw new BadRequestException(AllMessages.SMTHG_WRNG);
    }
  }

  /**
   * @description Get order count
   * @param user
   * @returns
   */
  async orderCount(user: getUser) {
    try {
      const { storeId, userId, isConsumer } = user;

      const sum = (orders: any[], statuses: PACKAGE_STATUS[], manual: number | null = null) =>
        orders
          .filter((o) => statuses.includes(o.status) && (manual === null || Number(o.isManualOrder) === manual))
          .reduce((acc, o) => acc + Number(o.count), 0);

      if (isConsumer) {
        const cOrders = await this.pkgRepo.packageCustomerModel.findAll({
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

        const orders = await this.pkgRepo.packageOrderModel.findAll({
          where: { id: { [Op.in]: packageIds } },
          attributes: ['status', 'isManualOrder', [Sequelize.fn('COUNT', Sequelize.col('id')), 'count']],
          group: ['status', 'isManualOrder'],
          raw: true,
        });

        const consumerCount = {
          openOrders: sum(orders, [PACKAGE_STATUS.CREATED, PACKAGE_STATUS.INITIATED]),
          review: sum(orders, [PACKAGE_STATUS.IN_REVIEW]),
          submitted: sum(orders, [PACKAGE_STATUS.CONFIRM, PACKAGE_STATUS.IN_PROGRESS], 0),
          inBound: sum(orders, [PACKAGE_STATUS.CLOSE]),
          completed: sum(orders, [PACKAGE_STATUS.COMPLETED]),
        };

        return { success: true, data: consumerCount };
      }

      // store flow
      const orders = await this.pkgRepo.packageOrderModel.findAll({
        where: { store_id: storeId },
        attributes: ['status', 'isManualOrder', [Sequelize.fn('COUNT', Sequelize.col('id')), 'count']],
        group: ['status', 'isManualOrder'],
        raw: true,
      });

      const [requestCount, withdrawalRequestCount, priceChangeRequestCount, incomingRequestCount] = await Promise.all([
        this.productRepo.inventoryRequestModel.count({
          where: { store_id: storeId, status: 'Requested' },
        }),
        this.productRepo.WithdrawnRequestModel.count({
          where: { store_id: storeId, status: 'Requested' },
        }),
        this.productRepo.priceChangeRequestModel.count({
          where: { store_id: storeId, status: 'Requested' },
        }),
        this.productRepo.variantModel.count({
          where: { store_id: storeId, status: 4 },
        }),
      ]);

      const finalCount = {
        openRequests: sum(orders, [(PACKAGE_STATUS.CREATED, PACKAGE_STATUS.INITIATED)]),
        inReview: sum(orders, [PACKAGE_STATUS.IN_REVIEW]),
        readyToProcess: sum(orders, [PACKAGE_STATUS.IN_PROGRESS]),
        completed: sum(orders, [(PACKAGE_STATUS.COMPLETED, PACKAGE_STATUS.CLOSE)]),
        confirm: sum(orders, [PACKAGE_STATUS.CONFIRM], 0),
        requestCount,
        withdrawalRequestCount,
        priceChangeRequestCount,
        incomingRequestCount,
      };

      return { success: true, data: finalCount };
    } catch (err) {
      console.log('err in order count', err);
      throw new BadRequestException(AllMessages.SMTHG_WRNG);
    }
  }

  /**
   * @description get agent list by type
   */
  async agentList(user: getUser, params: DTO.AgentTypeParamDto) {
    try {
      const { type } = params;
      let userIds: any[] = [];

      if (type === 'sales') {
        userIds = await this.userRepo.userStoreMappingModel.findAll({
          where: { storeId: user.storeId, is_sales_agent: true },
          attributes: ['userId', 'is_sales_agent', 'is_logistic_agent'],
        });
      }

      if (type === 'logistic') {
        userIds = await this.userRepo.userStoreMappingModel.findAll({
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

      const agents = await this.userRepo.userModel.findAll({
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
      console.error('❌ agentList error:', err);
      throw new BadRequestException(AllMessages.SMTHG_WRNG);
    }
  }

  /**
   * @description Start order by employee (Logistic Agent)
   */
  async startOrderProcess(user: getUser, body: DTO.StartOrderProcessDto) {
    try {
      const { orderId, agentId, agentName } = body;

      const order = await this.pkgRepo.packageOrderModel.findByPk(orderId, {
        attributes: ['id', 'status', 'store_id', 'employee_id'],
      });

      if (!order) {
        throw new BadRequestException(AllMessages.PAKG_NF || 'Order not found.');
      }

      order.employee_id = Number(agentId || user.userId);
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
      console.error('❌ startOrderProcess error:', err);
      throw new BadRequestException(AllMessages.SMTHG_WRNG);
    }
  }

  /**
   * @description Assign sales agent to order
   */
  async assignSalesAgent(body: DTO.AssignSalesAgentDto) {
    try {
      const { orderId, agentId, agentName } = body;

      const order = await this.pkgRepo.packageOrderModel.findByPk(orderId);
      if (!order) {
        throw new BadRequestException(AllMessages.PAKG_NF || 'Order not found.');
      }

      order.sales_agent_id = agentId;
      await order.save();

      return {
        success: true,
        message: `Sales assigned to ${agentName}.`,
        data: order,
      };
    } catch (err) {
      console.error('❌ assignSalesAgent error:', err);
      throw new BadRequestException(AllMessages.SMTHG_WRNG);
    }
  }

  async getVariantCost(body: any) {
    try {
      const { variantIds } = body;

      const variants = await this.productRepo.variantModel.findAll({
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

  /**
   * @description Add Notes for orders
   */
  async addNotes(body: any) {
    try {
      const { orderId, notes } = body;
      const order = await this.pkgRepo.packageOrderModel.findByPk(orderId);

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
      console.error('❌ addNotes error:', err);
      throw new BadRequestException(AllMessages.SMTHG_WRNG);
    }
  }

  async getNotes(param: DTO.OrderIdParamDto) {
    try {
      const { orderId } = param;
      const order = await this.pkgRepo.packageOrderModel.findByPk(orderId, { attributes: ['notes'] });

      if (!order) {
        throw new BadRequestException(AllMessages.PAKG_NF);
      }

      return {
        success: true,
        message: 'Notes fetched successfully.',
        data: order.notes,
      };
    } catch (err) {
      throw new BadRequestException(AllMessages.SMTHG_WRNG);
    }
  }

  /**
   * @description Confirm order from store side
   */
  async storeConfirm(param: DTO.OrderIdParamDto, user: getUser, body: any) {
    const transaction = await this.sequelize.transaction();
    try {
      const { orderId } = param;
      const { storeId, userId, roleId, token } = user;
      const { brandIds = [], confirmDate } = body;

      const order = await this.pkgRepo.packageOrderModel.findOne({
        where: {
          id: orderId,
          status: PACKAGE_STATUS.CONFIRM,
        },
        include: [
          { model: this.storeRepo.storeModel, as: 'store' },
          {
            model: this.pkgRepo.packageCustomerModel,
            where: { package_id: orderId },
            as: 'customers',
            attributes: ['customer_id'],
            include: [
              {
                model: this.userRepo.userModel,
                as: 'customer',
                attributes: ['firstName', 'lastName', 'email'],
              },
            ],
          },
        ],
        transaction,
      });

      if (!order) {
        await transaction.rollback();
        throw new BadRequestException(AllMessages.PAKG_NF);
      }

      if (order.sales_agent_id == null) {
        await this.pkgRepo.packageOrderModel.update(
          { sales_agent_id: userId },
          { where: { id: orderId }, transaction },
        );
      }

      if (brandIds.length > 0) {
        await this.pkgRepo.packageBrandModel.update(
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

      // Mark inventory as sold
      await this.MarkInventorySold.markSoldInventory(
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

      // Sockets
      this.socketGateway.server.emit(`submittedToInbound-${orderId}`, {
        storeName: order?.store?.store_name,
      });
      // this.socketGateway.server.emit(`statusChanged-${customerId}`);
      // this.socketGateway.server.emit(`statusChanged-${storeId}`);

      return {
        success: true,
        message: AllMessages.ORDR_CNFD,
      };
    } catch (err) {
      console.error('❌ storeConfirm error:', err);
      if (transaction) await transaction.rollback();
      throw new BadRequestException(AllMessages.SMTHG_WRNG);
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

        const dbVariants = await this.productRepo.variantModel.findAll({
          where: {
            productId: productMainId,
            status: 1,
            quantity: { [Op.gt]: 0 },
            [Op.and]: [
              Sequelize.where(Sequelize.fn('TRIM', Sequelize.col('option1Value')), {
                [Op.in]: sizes,
              }),
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
          message: 'Inventory quantities have changed, this page will now refresh with updates.',
        };
      }

      return {
        success: true,
        refresh: false,
        message: 'All variants are in stock.',
      };
    } catch (err) {
      throw new BadRequestException(AllMessages.SMTHG_WRNG);
    }
  }
} // End Class
