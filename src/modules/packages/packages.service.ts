import { BadRequestException, Injectable } from '@nestjs/common';
import { Op } from 'sequelize';
import type { getUser } from 'src/common/interfaces/common/getUser';
import { PACKAGE_STATUS, PAYMENT_STATUS } from '../../common/constants/enum';
import { AllMessages } from '../../common/constants/messages';
import {
  generateAlphaNumericPassword,
  hashPasswordMD5,
} from '../../common/helpers/hash.helper';
import { generateOrderId } from '../../common/helpers/order-generator.helper';
import { sortSizes } from '../../common/helpers/sort-sizes.helper';

import { ConsumerInventoryHelperService } from 'src/common/helpers/consumerInventory';
import { PackageRepository } from 'src/db/repository/package.repository';
import { ProductRepository } from 'src/db/repository/product.repository';
import { StoreRepository } from 'src/db/repository/store.repository';
import { UserRepository } from 'src/db/repository/user.repository';
import { SocketGateway } from '../socket/socket.gateway';

@Injectable()
export class PackagesService {
  constructor(
    private readonly pkgRepo: PackageRepository,
    private readonly storeRepo: StoreRepository,
    private readonly userRepo: UserRepository,
    private readonly productRepo: ProductRepository,

    private socketGateway: SocketGateway,
    private readonly ConsumerInventoryHelper: ConsumerInventoryHelperService,
  ) {}

  /**
   * @description Handles payment for package orders.
   */
  async makePayment(user: getUser, body: any) {
    if (!this.pkgRepo.packageOrderModel.sequelize)
      throw new BadRequestException('Sequelize not initialized');
    const t = await this.pkgRepo.packageOrderModel.sequelize.transaction();
    try {
      const { packageOrderId, paymentDetails } = body;
      const order = await this.pkgRepo.packageOrderModel.findByPk(
        packageOrderId,
        {
          transaction: t,
        },
      );

      if (!order) throw new BadRequestException(AllMessages.PAKG_NF);

      if (!order.employee_id) {
        order.employee_id = Number(user.userId);
        await order.save({ transaction: t });
      }

      const allowedStatuses = [
        PACKAGE_STATUS.STORE_CONFIRM,
        PACKAGE_STATUS.IN_PROGRESS,
        PACKAGE_STATUS.COMPLETED,
        PACKAGE_STATUS.CLOSE,
      ];

      // 🧩 Ensure payment is allowed
      if (!allowedStatuses.includes(order.status as any)) {
        throw new BadRequestException(
          'Order is not ready for payment. Store confirmation needed.',
        );
      }

      const {
        payment_method,
        payment_date,
        amount,
        total_amount,
        fullPayment,
      } = paymentDetails;

      // 🧩 Fetch existing payments
      const existingPayments = await this.pkgRepo.packagePaymentModel.findAll({
        where: { package_id: packageOrderId },
        order: [['payment_date', 'ASC']],
        transaction: t,
        raw: true,
      });

      const totalReceivedBefore = existingPayments.reduce(
        (sum, p) => sum + (p.received_amount || 0),
        0,
      );

      // 🧩 Validate new payment
      if (totalReceivedBefore + amount > (total_amount ?? order.total_amount)) {
        throw new BadRequestException('Invalid payment amount.');
      }

      // 🧩 Create new payment record
      await this.pkgRepo.packagePaymentModel.create(
        {
          package_id: packageOrderId,
          payment_method,
          payment_date,
          total_amount: total_amount ?? order.total_amount,
          received_amount: amount,
        },
        { transaction: t },
      );

      // 🧩 Update payment status
      const totalReceivedAfter = totalReceivedBefore + amount;
      order.paymentStatus =
        fullPayment || totalReceivedAfter >= order.total_amount
          ? PAYMENT_STATUS.CONFIRMED
          : PAYMENT_STATUS.PENDING;

      await order.save({ transaction: t });
      await t.commit();

      // 🧩 Realtime notify clients (optional)
      this.socketGateway.server.emit(`submitted-${packageOrderId}`, {});

      return { success: true, message: AllMessages.PYMT_SUCCSS };
    } catch (err) {
      await t.rollback();
      throw err instanceof BadRequestException
        ? err
        : new BadRequestException(AllMessages.SMTHG_WRNG);
    }
  }

  /**
   * @description payment detail of order
   */
  async paymentDetail(orderId: number) {
    try {
      const order = await this.pkgRepo.packageOrderModel.findOne({
        where: { id: orderId },
        attributes: ['id', 'total_amount', 'paymentStatus'],
        include: [
          {
            model: this.pkgRepo.packagePaymentModel,
            as: 'payment',
          },
        ],
      });

      if (!order) throw new BadRequestException(AllMessages.PAKG_NF);

      const payments = (order as any).payment || [];
      const totalReceived = payments.reduce(
        (sum: number, p: any) => sum + (p.received_amount || 0),
        0,
      );
      const pendingAmount = order.total_amount - totalReceived;

      const paymentHistory = payments.map((p: any) => ({
        id: p.id,
        date: p.payment_date,
        method: p.payment_method,
        received_amount: p.received_amount,
      }));

      return {
        success: true,
        data: {
          orderId: order.id,
          total_amount: order.total_amount,
          total_received: totalReceived,
          pending_amount: pendingAmount,
          payment_status: order.paymentStatus,
          payment_history: paymentHistory,
        },
      };
    } catch (err) {
      throw err instanceof BadRequestException
        ? err
        : new BadRequestException(AllMessages.SMTHG_WRNG);
    }
  }

  /**
   * @description Handles shipment details for orders
   */
  async makeShipment(user: any, body: any) {
    if (!this.pkgRepo.packageOrderModel.sequelize)
      throw new BadRequestException('Sequelize not initialized');
    const t = await this.pkgRepo.packageOrderModel.sequelize.transaction();
    try {
      const {
        packageOrderId,
        shipmentDetails = [],
        localPickup = false,
      } = body;
      const order = await this.pkgRepo.packageOrderModel.findByPk(
        packageOrderId,
        {
          transaction: t,
        },
      );

      if (!order) {
        await t.rollback();
        throw new BadRequestException(AllMessages.PAKG_NF);
      }

      if (order.status !== PACKAGE_STATUS.IN_PROGRESS) {
        throw new BadRequestException(
          'Order is not ready for shipment. Store confirmation needed.',
        );
      }

      if (!order.employee_id) {
        order.employee_id = user.userId;
      }

      if (order.employee_id !== user.userId) {
        throw new BadRequestException(
          'You are not authorized to add shipment for this package.',
        );
      }

      await order.save({ transaction: t });

      await this.pkgRepo.packageShipmentModel.destroy({
        where: { package_id: packageOrderId },
        transaction: t,
      });

      if (localPickup === true) {
        await this.pkgRepo.packageShipmentModel.create(
          {
            package_id: packageOrderId,
            localPickup: true,
            shipment_date: shipmentDetails[0]?.shipment_date || null,
            shipping_carrier: null,
            tracking_number: null,
          },
          { transaction: t },
        );
      } else {
        if (shipmentDetails.length === 0) {
          throw new BadRequestException(AllMessages.NO_SHIPMENT_DETAILS);
        }

        const shipmentRecords = shipmentDetails.map((shipment: any) => ({
          package_id: packageOrderId,
          shipment_date: shipment.shipment_date,
          shipping_carrier: shipment.shipping_carrier,
          tracking_number: shipment.tracking_number,
          localPickup: false,
        }));

        await this.pkgRepo.packageShipmentModel.bulkCreate(shipmentRecords, {
          transaction: t,
        });
      }

      order.shipmentStatus = true;
      await order.save({ transaction: t });
      await t.commit();

      this.socketGateway.server.emit(`submitted-${packageOrderId}`);
      return { success: true, message: AllMessages.SHP_DTL };
    } catch (err) {
      await t.rollback();
      throw err instanceof BadRequestException
        ? err
        : new BadRequestException(AllMessages.SMTHG_WRNG);
    }
  }

  /**
   * @description Shipment details List
   */
  async shipmentDetail(orderId: number) {
    try {
      const list = await this.pkgRepo.packageShipmentModel.findAll({
        where: { package_id: orderId },
      });
      return { success: true, data: list };
    } catch (err) {
      throw new BadRequestException(AllMessages.SMTHG_WRNG);
    }
  }

  /**
   * @description Close order
   */
  async closeOrder(user: any, orderId: number, body: any) {
    if (!this.pkgRepo.packageOrderModel.sequelize)
      throw new BadRequestException('Sequelize not initialized');
    const t = await this.pkgRepo.packageOrderModel.sequelize.transaction();
    try {
      const { storeId } = user;
      const { brandIds = [] } = body;

      const order = await this.pkgRepo.packageOrderModel.findOne({
        where: {
          id: orderId,
          status: PACKAGE_STATUS.IN_PROGRESS,
          shipmentStatus: true,
        },
        include: [
          { model: this.storeRepo.storeModel, as: 'store' },
          {
            model: this.pkgRepo.packageCustomerModel,
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

      if (!order) {
        await t.rollback();
        throw new BadRequestException(
          'Order not found or not in progress or shipment not done yet.',
        );
      }

      if (order.sales_agent_id !== user.userId) {
        await t.rollback();
        throw new BadRequestException(
          'You are not authorized to close this package.',
        );
      }

      if (brandIds.length > 0) {
        await this.pkgRepo.packageBrandModel.update(
          {
            selected: this.pkgRepo.packageOrderModel.sequelize.literal(`
                CASE
                    WHEN id IN (${brandIds.join(',')}) THEN TRUE
                    ELSE FALSE
                END
            `),
          },
          {
            where: { package_id: orderId },
            transaction: t,
          },
        );
      }

      const customer = (order as any).customers?.[0];
      const customerId = customer?.customer_id;

      order.status = PACKAGE_STATUS.CLOSE;
      await order.save({ transaction: t });
      await t.commit();

      // Sockets
      this.socketGateway.server.emit(`submittedToInbound-${orderId}`, {
        storeName: (order as any).store?.store_name,
      });
      if (customerId)
        this.socketGateway.server.emit(`statusChanged-${customerId}`);
      this.socketGateway.server.emit(`statusChanged-${storeId}`);

      return { success: true, message: AllMessages.PKG_CLSD };
    } catch (err) {
      if (t) await t.rollback();
      throw err instanceof BadRequestException
        ? err
        : new BadRequestException(AllMessages.SMTHG_WRNG);
    }
  }

  /**
   * @description Item received
   */
  async itemReceived(itemId: number) {
    if (!this.pkgRepo.packageOrderModel.sequelize)
      throw new BadRequestException('Sequelize not initialized');
    const t = await this.pkgRepo.packageOrderModel.sequelize.transaction();
    try {
      const orderItem = await this.pkgRepo.packageBrandItemsModel.findOne({
        where: { id: itemId },
        transaction: t,
      });

      if (!orderItem) {
        await t.rollback();
        throw new BadRequestException('Item not found.');
      }

      (orderItem as any).isItemReceived = 1; // Assuming 1 for RECEIVED based on ORDER_ITEMS.ITM_RECEIVED
      await orderItem.save({ transaction: t });
      await t.commit();

      return { success: true, message: AllMessages.ITM_RECVD };
    } catch (err) {
      if (t) await t.rollback();
      throw new BadRequestException(AllMessages.SMTHG_WRNG);
    }
  }

  /**
   * @description remove Shipment detail.
   */
  async removePayment(body: any) {
    if (!this.pkgRepo.packageOrderModel.sequelize)
      throw new BadRequestException('Sequelize not initialized');
    const t = await this.pkgRepo.packageOrderModel.sequelize.transaction();
    try {
      const { paymentId, packageOrderId } = body;
      await this.pkgRepo.packagePaymentModel.destroy({
        where: { id: paymentId },
        transaction: t,
      });

      const order = await this.pkgRepo.packageOrderModel.findByPk(
        packageOrderId,
        {
          transaction: t,
        },
      );
      if (order) {
        order.paymentStatus = PAYMENT_STATUS.PENDING;
        await order.save({ transaction: t });
      }

      await t.commit();
      return { success: true, message: 'Payment removed successfully.' };
    } catch (err) {
      await t.rollback();
      throw new BadRequestException(AllMessages.SMTHG_WRNG);
    }
  }

  /**
   * @description Get all invoices
   */
  async invoiceList(user: any, query: any) {
    try {
      const page = Math.max(1, parseInt(query.page, 10) || 1);
      const limit = Math.max(1, parseInt(query.limit, 10) || 10);
      const offset = (page - 1) * limit;

      const { count: total, rows } =
        await this.pkgRepo.invoiceModel.findAndCountAll({
          where: { store_id: user.storeId },
          order: [['invoice_date', 'DESC']],
          attributes: {
            exclude: ['createdAt', 'updatedAt', 'invoiceItems'],
          },
          include: [
            {
              model: this.userRepo.userModel,
              as: 'consumer',
              attributes: ['id', 'firstName', 'lastName', 'email'],
            },
          ],
          limit,
          offset,
        });

      return {
        success: true,
        data: rows,
        pagination: {
          total,
          totalPages: Math.max(1, Math.ceil(total / limit)),
          currentPage: page,
          perPage: limit,
        },
      };
    } catch (err) {
      throw new BadRequestException(AllMessages.SMTHG_WRNG);
    }
  }

  /**
   * @description Invoice details
   */
  async invoiceDetail(invoiceId: number) {
    try {
      const invoice = await this.pkgRepo.invoiceModel.findByPk(invoiceId, {
        include: [
          {
            model: this.userRepo.userModel,
            as: 'consumer',
            attributes: [
              'id',
              'firstName',
              'lastName',
              'email',
              'address',
              'city',
              'state',
              'zip',
              'country',
              'phnNo',
            ],
          },
          {
            model: this.storeRepo.storeModel,
            as: 'store',
            attributes: ['store_id', 'store_name'],
            include: [
              {
                model: this.storeRepo.storeLocationMappingModel,
                where: { default_store_location: true },
                as: 'address',
                attributes: [
                  'address1',
                  'address2',
                  'province',
                  'country',
                  'zip',
                  'phone',
                ],
              },
            ],
          },
        ],
      });

      if (!invoice) throw new BadRequestException(AllMessages.PAKG_NF);

      return { success: true, data: invoice };
    } catch (err) {
      throw err instanceof BadRequestException
        ? err
        : new BadRequestException(AllMessages.SMTHG_WRNG);
    }
  }

  /**
   * @description save pdf url in db
   */
  async savepdf(body: any) {
    try {
      const { pdfUrl, invoiceId } = body;
      if (!pdfUrl) throw new BadRequestException('PDF URL is required.');

      const invoice = await this.pkgRepo.invoiceModel.findByPk(invoiceId);
      if (!invoice) throw new BadRequestException(AllMessages.PAKG_NF);

      invoice.pdf_URL = pdfUrl;
      await invoice.save();

      return {
        success: true,
        message: 'PDF URL saved successfully.',
        pdfUrl,
      };
    } catch (err) {
      throw err instanceof BadRequestException
        ? err
        : new BadRequestException(AllMessages.SMTHG_WRNG);
    }
  }

  /**
   * @description Mark all items received
   */
  async markAll(body: any) {
    if (!this.pkgRepo.packageOrderModel.sequelize)
      throw new BadRequestException('Sequelize not initialized');
    const t = await this.pkgRepo.packageOrderModel.sequelize.transaction();
    try {
      const { brandIds = [], packageOrderId } = body;
      const order = await this.pkgRepo.packageOrderModel.findOne({
        where: { id: packageOrderId },
      });

      if (order?.status !== PACKAGE_STATUS.CLOSE) {
        await t.rollback();
        throw new BadRequestException('Order not closed yet.');
      }

      // Step 1: Find brand items that are part of the specified brands, not yet received, and have consumer demand.
      const orderItems = await this.pkgRepo.packageBrandItemsModel.findAll({
        where: {
          packageBrand_id: { [Op.in]: brandIds },
          isItemReceived: null,
          consumerDemand: { [Op.gt]: 0 },
        },
        transaction: t,
      });

      if (!orderItems.length) {
        await t.rollback();
        throw new BadRequestException('No items found to mark as received.');
      }

      const itemIds = orderItems.map((item) => item.id);

      // Step 2: Update brand items to mark them as received.
      await this.pkgRepo.packageBrandItemsModel.update(
        { isItemReceived: 1 }, // ORDER_ITEMS.ITM_RECEIVED
        { where: { id: { [Op.in]: itemIds } }, transaction: t },
      );

      // Step 3: Fetch related item quantities for the received items.
      const qtyItems = await this.pkgRepo.packageBrandItemsQtyModel.findAll({
        where: { item_id: { [Op.in]: itemIds } },
        transaction: t,
      });

      if (qtyItems.length) {
        // Prepare updates for quantities, setting receivedQuantity to selectedCapacity.
        const updates = qtyItems.map((item) => ({
          id: item.id,
          item_id: item.item_id,
          variant_size: item.variant_size,
          maxCapacity: item.maxCapacity,
          selectedCapacity: item.selectedCapacity,
          shortage: item.shortage,
          receivedQuantity: item.selectedCapacity,
        }));

        // Step 4: Bulk update quantities in the database.
        await this.pkgRepo.packageBrandItemsQtyModel.bulkCreate(updates, {
          updateOnDuplicate: ['receivedQuantity'],
          transaction: t,
        });
      }

      await t.commit();
      if (order?.store_id) {
        this.socketGateway.server.emit(
          `updateQty-${order.store_id}-${packageOrderId}`,
        );
      }

      return { success: true, message: AllMessages.ALL_ITM_RCVD };
    } catch (err) {
      if (t) await t.rollback();
      throw err instanceof BadRequestException
        ? err
        : new BadRequestException(AllMessages.SMTHG_WRNG);
    }
  }

  /**
   * @description Update shortage quantities for package items
   */
  async shortageQuantities(body: any) {
    if (!this.pkgRepo.packageOrderModel.sequelize)
      throw new BadRequestException('Sequelize not initialized');
    const t = await this.pkgRepo.packageOrderModel.sequelize.transaction();
    try {
      const { packageOrderId, itemsArr = [] } = body;
      const order = await this.pkgRepo.packageOrderModel.findOne({
        where: { id: packageOrderId },
        include: [{ model: this.storeRepo.storeModel, as: 'store' }],
      });

      if (order?.status !== PACKAGE_STATUS.CLOSE) {
        await t.rollback();
        throw new BadRequestException('Order not closed yet.');
      }

      const itemIds = itemsArr.map((p: any) => p.packageItemId);
      const items = await this.pkgRepo.packageBrandItemsModel.findAll({
        where: { id: itemIds },
        transaction: t,
      });

      const validItemIds = new Set(items.map((item) => item.id));
      const updateOperations: any[] = [];
      const itemStatusMap = new Map();

      for (const { packageItemId, variants, isItemReceived } of itemsArr) {
        if (!validItemIds.has(packageItemId)) continue;
        if (isItemReceived != null)
          itemStatusMap.set(packageItemId, isItemReceived);

        for (const { size, receivedQuantity, selectedQuantity } of variants) {
          updateOperations.push({
            receivedQuantity,
            shortage: selectedQuantity - receivedQuantity,
            where: { item_id: packageItemId, variant_size: size },
          });
        }
      }

      if (updateOperations.length > 0) {
        await Promise.all(
          updateOperations.map((op) =>
            this.pkgRepo.packageBrandItemsQtyModel.update(
              { receivedQuantity: op.receivedQuantity, shortage: op.shortage },
              { where: op.where, transaction: t },
            ),
          ),
        );
      }

      for (const [itemId, status] of itemStatusMap.entries()) {
        await this.pkgRepo.packageBrandItemsModel.update(
          { isItemReceived: status as any },
          { where: { id: itemId }, transaction: t },
        );
      }

      await t.commit();
      const anyOrder = order as any;
      if (anyOrder?.store?.store_id) {
        this.socketGateway.server.emit(
          `updateQty-${anyOrder.store.store_id}-${packageOrderId}`,
        );
      }

      return { success: true, message: AllMessages.SHRTG_QTY };
    } catch (err) {
      if (t) await t.rollback();
      throw err instanceof BadRequestException
        ? err
        : new BadRequestException(AllMessages.SMTHG_WRNG);
    }
  }

  /**
   * @description Check the user is admin or not and check multiple store before create Item (completePkg)
   */
  async checkAdminStore(user: any) {
    try {
      const { userId } = user;
      const adminRole = await this.userRepo.roleModel.findOne({
        where: { roleName: 'ADMIN' },
      });
      if (!adminRole) throw new BadRequestException('Admin role not found.');

      const isAdmin = await this.userRepo.userStoreMappingModel.findAll({
        where: { userId, roleId: adminRole.roleId },
        attributes: ['storeId'],
      });

      if (isAdmin.length > 1) {
        const storeList = await this.storeRepo.storeModel.findAll({
          where: { store_id: isAdmin.map((store) => store.storeId) },
        });
        return {
          success: true,
          message: 'Multiple stores.',
          showStoreList: true,
          storeList,
        };
      } else if (isAdmin.length === 1) {
        const storeId = isAdmin[0].storeId;
        return {
          success: true,
          message: 'Single store.',
          showStoreList: false,
          storeId,
        };
      }

      return {
        success: true,
        message: 'User is not admin.',
        showStoreList: false,
      };
    } catch (err) {
      throw new BadRequestException(AllMessages.SMTHG_WRNG);
    }
  }

  /**
   * @description Mark order Complete
   */
  async completePkg(user: any, orderId: number, body: any) {
    if (!this.pkgRepo.packageOrderModel.sequelize)
      throw new BadRequestException('Sequelize not initialized');
    const t = await this.pkgRepo.packageOrderModel.sequelize.transaction();
    try {
      const pkgOrder = await this.pkgRepo.packageOrderModel.findByPk(orderId);
      if (!pkgOrder) {
        await t.rollback();
        throw new BadRequestException(AllMessages.PAKG_NF);
      }

      if (pkgOrder.status === PACKAGE_STATUS.COMPLETED) {
        await t.rollback();
        return { success: true, message: 'Package is already completed.' };
      }

      pkgOrder.status = PACKAGE_STATUS.COMPLETED;
      await pkgOrder.save({ transaction: t });
      await t.commit();

      this.socketGateway.server.emit(`processToCompleted-${orderId}`, {
        consumerName: user.fullName,
      });
      this.socketGateway.server.emit(`statusChanged-${pkgOrder.store_id}`);
      this.socketGateway.server.emit(`statusChanged-${user.userId}`);

      // 🔥 Background task for Consumer Inventory
      const { pDate, storeId = '' } = body;
      setImmediate(async () => {
        try {
          await this.ConsumerInventoryHelper.consumerInventoryBackground(
            orderId,
            user.userId,
            user.roleId,
            pDate,
            storeId,
            user.token,
          );
          console.log(`✅ ConsumerInventory processed for order ${orderId}`);
        } catch (err) {
          console.error('❌ Background ConsumerInventory failed:', err);
        }
      });

      return { success: true, message: AllMessages.PKG_CMPLTD };
    } catch (err) {
      if (t) await t.rollback();
      throw err instanceof BadRequestException
        ? err
        : new BadRequestException(AllMessages.SMTHG_WRNG);
    }
  }

  /**
   * @description Package slip pdf all data (Invoice)
   */
  async packageSlip(user: any, body: any) {
    try {
      const { orderId, brandIds = [] } = body;

      const packageOrderData = await this.pkgRepo.packageOrderModel.findByPk(
        orderId,
        {
          include: [
            {
              model: this.storeRepo.storeModel,
              as: 'store',
              include: [
                {
                  model: this.storeRepo.storeLocationMappingModel,
                  as: 'address',
                  where: { default_store_location: true },
                  required: false,
                },
              ],
            },
            {
              model: this.pkgRepo.packageCustomerModel,
              as: 'customers',
              include: [{ model: this.userRepo.userModel, as: 'customer' }],
            },
            { model: this.pkgRepo.packageShipmentModel, as: 'shipment' },
            { model: this.pkgRepo.packagePaymentModel, as: 'payment' },
          ],
        },
      );

      if (!packageOrderData)
        throw new BadRequestException('Package order not found');

      const packageOrderItems =
        await this.pkgRepo.packageBrandItemsModel.findAll({
          where: { packageBrand_id: { [Op.in]: brandIds } },
          include: [
            {
              model: this.productRepo.productListModel,
              as: 'products',
              include: [
                { model: this.productRepo.brandModel, as: 'brandData' },
              ],
            },
            {
              model: this.pkgRepo.packageBrandItemsCapacityModel,
              as: 'capacities',
              include: [
                {
                  model: this.productRepo.variantModel,
                  as: 'variant',
                  include: [
                    { model: this.productRepo.inventoryModel, as: 'inventory' },
                  ],
                },
              ],
            },
            {
              model: this.pkgRepo.packageBrandItemsQtyModel,
              as: 'sizeQuantities',
            },
          ],
        });

      if (!packageOrderItems.length)
        throw new BadRequestException(AllMessages.PAKG_NF);

      const singleCustomer = (packageOrderData as any).customers?.[0] || null;
      const consumerId = singleCustomer?.customer?.id;

      let shippingDetails: any = null;
      if (consumerId) {
        shippingDetails = await this.pkgRepo.consumerShippingModel.findOne({
          where: { consumerId, selected: true },
        });
      }

      const groupedData: any = {};
      for (const item of packageOrderItems) {
        const product = (item as any).products;
        const brandName = product?.brandData?.brandName || 'Unknown';
        const brandId = (item as any).packageBrand_id;

        if (!groupedData[brandId]) {
          groupedData[brandId] = { brand_id: brandId, brandName, products: [] };
        }

        const variants: any[] = [];
        const sizeAndQuantity: any = {};
        const consumerDemand: any = {};
        const sizeLocationMap: any = {};

        for (const cap of (item as any).capacities || []) {
          const variant = cap.variant;
          if (!variant) continue;
          const sizeKey = String(variant.option1Value || 'Unknown').trim();
          sizeLocationMap[sizeKey] =
            variant.location != null ? String(variant.location).trim() : 'N/A';

          variants.push({
            id: variant.id,
            option1Value: sizeKey,
            total_quantity: cap.maxCapacity || 0,
            stock_quantity: variant.quantity || 0,
            location: sizeLocationMap[sizeKey],
            status: variant.status,
            image: variant.inventory?.image || null,
          });

          if (!sizeAndQuantity[sizeKey]) {
            sizeAndQuantity[sizeKey] = {
              quantity: 0,
              demand: 0,
              shortage: 0,
              receivedQuantity: 0,
              location: sizeLocationMap[sizeKey],
              status: variant.status,
              image: variant.inventory?.image || null,
            };
          }
          sizeAndQuantity[sizeKey].quantity += variant.quantity || 0;
        }

        for (const qty of (item as any).sizeQuantities || []) {
          const sizeKey = String(qty.variant_size || 'Unknown').trim();
          const selected = qty.selectedCapacity || 0;
          consumerDemand[sizeKey] = selected;

          if (!sizeAndQuantity[sizeKey]) {
            sizeAndQuantity[sizeKey] = {
              quantity: 0,
              demand: 0,
              shortage: 0,
              receivedQuantity: 0,
              location: sizeLocationMap[sizeKey] || 'N/A',
            };
          }
          sizeAndQuantity[sizeKey].demand = selected;
          sizeAndQuantity[sizeKey].shortage = qty.shortage || 0;
          sizeAndQuantity[sizeKey].receivedQuantity =
            qty.receivedQuantity ?? selected;
        }

        const sortedVariants = sortSizes(variants);
        const sortedSizeAndQuantity = sortSizes(Object.entries(sizeAndQuantity))
          .map(([size, obj]: [string, any]) => ({
            size,
            ...obj,
          }))
          .filter((entry: any) => entry.demand > 0);

        groupedData[brandId].products.push({
          name: product?.itemName || 'Unnamed',
          productMainId: product?.product_id,
          product_id: item.id,
          skuNumber: product?.skuNumber,
          image: product?.image || null,
          variants: sortedVariants,
          sizeAndQuantity: sortedSizeAndQuantity,
          price: (item as any).price,
          isItemReceived: (item as any).isItemReceived,
          consumerDemand,
        });
      }

      return {
        success: true,
        message: AllMessages.FTCH_PRODUCTS,
        packageOrder: {
          ...packageOrderData.toJSON(),
          customers: singleCustomer,
          shippingDetails,
        },
        data: Object.values(groupedData),
      };
    } catch (err) {
      throw err instanceof BadRequestException
        ? err
        : new BadRequestException(AllMessages.SMTHG_WRNG);
    }
  }

  /**
   * @description Generate custom invoice.
   */
  async customInvoice(user: any, body: any) {
    if (!this.pkgRepo.packageOrderModel.sequelize)
      throw new BadRequestException('Sequelize not initialized');
    const t = await this.pkgRepo.packageOrderModel.sequelize.transaction();
    try {
      const {
        email,
        billToDetails = {},
        totalAmount,
        receivedAmount,
        invoiceDate,
        invoiceItems = [],
      } = body;
      const {
        firstName = '',
        lastName = '',
        phone = '',
        address = '',
        city = '',
        state = '',
        zip = '',
        country = '',
        businessName = '',
      } = billToDetails;

      const lowerEmail = email.toLowerCase();
      let consumer = await this.userRepo.userModel.findOne({
        where: { email: lowerEmail },
        transaction: t,
      });

      if (consumer) {
        const updateData: any = {
          firstName,
          lastName,
          phnNo: phone,
          address,
          city,
          state,
          country,
          zip,
          businessName,
        };
        const fieldsToUpdate: any = {};
        for (const [key, value] of Object.entries(updateData)) {
          if (!(consumer as any)[key] && value) fieldsToUpdate[key] = value;
        }
        if (Object.keys(fieldsToUpdate).length > 0)
          await consumer.update(fieldsToUpdate, { transaction: t });
      } else {
        const plainPassword = generateAlphaNumericPassword();
        const hashedPassword = hashPasswordMD5(plainPassword);
        consumer = await this.userRepo.userModel.create(
          {
            email: lowerEmail,
            firstName,
            lastName,
            phnNo: phone,
            address,
            city,
            state,
            country,
            zip,
            businessName,
            password: hashedPassword,
          },
          { transaction: t },
        );
      }

      const role = await this.userRepo.roleModel.findOne({
        where: { roleName: 'CONSUMER' },
        transaction: t,
      });
      if (role) {
        await this.userRepo.userStoreMappingModel.findOrCreate({
          where: {
            userId: consumer.id,
            roleId: role.roleId,
            storeId: user.storeId,
          },
          defaults: {
            userId: consumer.id,
            roleId: role.roleId,
            storeId: user.storeId,
          },
          transaction: t,
        });
      }

      const invoiceNumber = await generateOrderId({
        storeId: user.storeId,
        prefix: 'INV',
        model: this.pkgRepo.invoiceModel,
        fieldName: 'invoice_number',
        transaction: t,
      });

      const invoice = await this.pkgRepo.invoiceModel.create(
        {
          invoice_number: invoiceNumber,
          consumer_id: consumer.id,
          store_id: user.storeId,
          invoice_date: invoiceDate,
          total_amount: totalAmount,
          received_amount: receivedAmount,
          invoiceItems,
          created_by: user.userId,
        },
        { transaction: t },
      );

      await t.commit();
      return {
        success: true,
        message: 'Custom invoice created successfully.',
        data: { invoiceId: invoice.id, invoiceNumber, consumerId: consumer.id },
      };
    } catch (err) {
      if (t) await t.rollback();
      throw err instanceof BadRequestException
        ? err
        : new BadRequestException(AllMessages.SMTHG_WRNG);
    }
  }
}
