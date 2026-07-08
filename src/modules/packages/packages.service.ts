import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
// import { Op } from 'sequelize';
import type { getUser } from 'src/common/interfaces/common/getUser';
import { ORDER_ITEMS, PACKAGE_STATUS, PAYMENT_STATUS } from '../../common/constants/enum';
import { AllMessages } from '../../common/constants/messages';
import { generateAlphaNumericPassword, hashPasswordMD5 } from '../../common/helpers/hash.helper';
import { generateOrderId } from '../../common/helpers/order-generator.helper';
import { sortSizes } from '../../common/helpers/sort-sizes.helper';

import { Op } from 'sequelize';
import { Sequelize } from 'sequelize-typescript';
import { ConsumerInventoryHelperService } from 'src/common/helpers/consumerInventory';
import { PackageRepository } from 'src/db/repository/package.repository';
import { ProductRepository } from 'src/db/repository/product.repository';
import { StoreRepository } from 'src/db/repository/store.repository';
import { UserRepository } from 'src/db/repository/user.repository';
import { TemplatesSlug } from '../mail/mail.constants';
import { MailService } from '../mail/mail.service';
import { SocketGateway } from '../socket/socket.gateway';
import * as DTO from './dto/packages.dto';

@Injectable()
export class PackagesService {
  constructor(
    private readonly pkgRepo: PackageRepository,
    private readonly storeRepo: StoreRepository,
    private readonly userRepo: UserRepository,
    private readonly productRepo: ProductRepository,

    private socketGateway: SocketGateway,
    private readonly ConsumerInventoryHelper: ConsumerInventoryHelperService,
    private readonly sequelize: Sequelize,
    private readonly mailService: MailService,
  ) {}

  /**
   * @description Handles payment for package orders.
   */
  async makePayment(user: getUser, body: DTO.MakePaymentDto) {
    const t = await this.sequelize.transaction();
    try {
      const { packageOrderId, paymentDetails } = body;
      const order = await this.pkgRepo.packageOrderModel.findByPk(packageOrderId, {
        transaction: t,
      });

      if (!order)
        throw new BadRequestException({
          message: AllMessages.PAKG_NF,
          success: false,
        });

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
        throw new BadRequestException({
          message: 'Order is not ready for payment. Store confirmation needed.',
          success: false,
        });
      }

      const { payment_method, payment_date, amount, total_amount, fullPayment } = paymentDetails;

      // 🧩 Fetch existing payments
      const existingPayments = await this.pkgRepo.packagePaymentModel.findAll({
        where: { package_id: packageOrderId },
        order: [['payment_date', 'ASC']],
        transaction: t,
        raw: true,
      });

      const totalReceivedBefore = existingPayments.reduce((sum, p) => sum + (p.received_amount || 0), 0);

      // 🧩 Validate new payment
      if (totalReceivedBefore + amount > (total_amount ?? order.total_amount)) {
        throw new BadRequestException({
          message: 'Invalid payment amount.',
          success: false,
        });
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
        fullPayment || totalReceivedAfter >= order.total_amount ? PAYMENT_STATUS.CONFIRMED : PAYMENT_STATUS.PENDING;

      await order.save({ transaction: t });
      await t.commit();

      // 🧩 Realtime notify clients (optional)
      this.socketGateway.server.emit(`submitted-${packageOrderId}`);

      return { success: true, message: AllMessages.PYMT_SUCCSS };
    } catch (err) {
      await t.rollback();
      throw err instanceof BadRequestException
        ? err
        : new BadRequestException({
            message: AllMessages.SMTHG_WRNG,
            success: false,
          });
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
            required: false,
            where: { payment_method: { [Op.ne]: null } },
            attributes: ['payment_method', 'payment_date', 'received_amount', 'total_amount', 'id'],
          },
        ],
      });

      if (!order)
        throw new BadRequestException({
          message: AllMessages.PAKG_NF,
          success: false,
        });

      const payments = (order as any).payment || [];
      const totalReceived = payments.reduce((sum: number, p: any) => sum + (p.received_amount || 0), 0);
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
        : new BadRequestException({
            message: AllMessages.SMTHG_WRNG,
            success: false,
          });
    }
  }

  /**
   * @description Handles shipment details for orders
   */
  async makeShipment(user: any, body: any) {
    if (!this.pkgRepo.packageOrderModel.sequelize)
      throw new BadRequestException({
        message: 'Sequelize not initialized',
        success: false,
      });
    const t = await this.pkgRepo.packageOrderModel.sequelize.transaction();
    try {
      const { packageOrderId, shipmentDetails = [], localPickup = false, shippingCost, handlingCost } = body;
      const order = await this.pkgRepo.packageOrderModel.findByPk(packageOrderId, {
        transaction: t,
      });

      if (!order) {
        await t.rollback();
        throw new BadRequestException({
          message: AllMessages.PAKG_NF,
          success: false,
        });
      }

      if (order.status !== PACKAGE_STATUS.IN_PROGRESS) {
        await t.rollback();
        throw new BadRequestException({
          message: 'Order is not ready for shipment. Store confirmation needed.',
          success: false,
        });
      }

      if (!order.employee_id) {
        order.employee_id = user.userId;
      }

      if (order.employee_id !== user.userId) {
        await t.rollback();
        throw new BadRequestException({
          message: 'You are not authorized to add shipment for this package.',
          success: false,
        });
      }

      if (shippingCost || handlingCost) {
        order.shipping_cost = shippingCost || null;
        order.handling_cost = handlingCost || null;
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

        order.shipmentStatus = true;
        await order.save({ transaction: t });
        await t.commit();

        this.socketGateway.server.emit(`submitted-${packageOrderId}`);
        return { success: true, message: AllMessages.SHP_DTL };
      }

      if (shipmentDetails.length === 0) {
        await t.rollback();
        throw new BadRequestException({
          message: AllMessages.NO_SHIPMENT_DETAILS,
          success: false,
        });
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

      order.shipmentStatus = true;
      await order.save({ transaction: t });
      await t.commit();

      this.socketGateway.server.emit(`submitted-${packageOrderId}`);
      return { success: true, message: AllMessages.SHP_DTL };
    } catch (err) {
      await t.rollback();
      console.error('❌ order Shipment error:', err);
      throw err instanceof BadRequestException ? err : new BadRequestException(AllMessages.SMTHG_WRNG);
    }
  }

  /**
   * @description Shipment details List
   */
  async shipmentDetail(orderId: number) {
    try {
      const order = await this.pkgRepo.packageOrderModel.findOne({
        where: { id: orderId },
        attributes: ['handling_cost', 'shipping_cost'],
      });

      const list = await this.pkgRepo.packageShipmentModel.findAll({
        where: { package_id: orderId },
        attributes: {
          exclude: ['createdAt', 'updatedAt'],
        },
      });

      return {
        success: true,
        data: {
          order,
          list,
        },
      };
    } catch (err) {
      throw new BadRequestException({
        message: AllMessages.SMTHG_WRNG,
        success: false,
      });
    }
  }

  /**
   * @description Close order
   */
  async closeOrder(user: any, params: DTO.OrderIdParamDto, body: any) {
    const t = await this.sequelize.transaction();
    try {
      const { storeId } = user;
      const { orderId } = params;
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
        throw new BadRequestException({
          message: 'Order not found or not in progress or shipment not done yet.',
          success: false,
        });
      }

      if (order.sales_agent_id !== user.userId) {
        throw new BadRequestException({
          message: 'You are not authorized to close this package.',
          success: false,
        });
      }

      if (brandIds.length > 0) {
        await this.pkgRepo.packageBrandModel.update(
          {
            selected: this.sequelize.literal(`
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
      if (customerId) this.socketGateway.server.emit(`statusChanged-${customerId}`);
      this.socketGateway.server.emit(`statusChanged-${storeId}`);

      return { success: true, message: AllMessages.PKG_CLSD };
    } catch (err) {
      if (t && !(t as { finished?: boolean }).finished) {
        await t.rollback();
      }
      console.error('❌ closeOrder error:', err);
      throw err instanceof BadRequestException ? err : new BadRequestException(AllMessages.SMTHG_WRNG);
    }
  }

  /**
   * @description Item received
   */
  async itemReceived(itemId: number) {
    if (!this.pkgRepo.packageOrderModel.sequelize)
      throw new BadRequestException({
        message: 'Sequelize not initialized',
        success: false,
      });
    const t = await this.pkgRepo.packageOrderModel.sequelize.transaction();
    try {
      const orderItem = await this.pkgRepo.packageBrandItemsModel.findOne({
        where: { id: itemId },
        transaction: t,
      });

      if (!orderItem) {
        await t.rollback();
        throw new BadRequestException({
          message: 'Item not found.',
          success: false,
        });
      }

      (orderItem as any).isItemReceived = ORDER_ITEMS.ITM_RECEIVED;
      await orderItem.save({ transaction: t });
      await t.commit();

      return { success: true, message: AllMessages.ITM_RECVD };
    } catch (err) {
      if (t) await t.rollback();
      console.error('❌ itemReceived:', err);
      throw new BadRequestException({
        message: AllMessages.SMTHG_WRNG,
        success: false,
      });
    }
  }

  /**
   * @description remove Shipment detail.
   */
  async removePayment(body: any) {
    if (!this.pkgRepo.packageOrderModel.sequelize)
      throw new BadRequestException({
        message: 'Sequelize not initialized',
        success: false,
      });
    const t = await this.pkgRepo.packageOrderModel.sequelize.transaction();
    try {
      const { paymentId } = body;
      const payment = await this.pkgRepo.packagePaymentModel.findByPk(paymentId, {
        transaction: t,
      });
      if (!payment) {
        await t.rollback();
        throw new BadRequestException({
          success: false,
          message: 'Payment removed successfully',
        });
      }

      await this.pkgRepo.packagePaymentModel.destroy({
        where: { id: paymentId },
        transaction: t,
      });

      await this.pkgRepo.packageOrderModel.update(
        { paymentStatus: PAYMENT_STATUS.PENDING },
        { where: { id: payment.package_id }, transaction: t },
      );

      await t.commit();
      return { success: true, message: AllMessages.PMT_DLT };
    } catch (err) {
      await t.rollback();
      console.error('❌ order remove Payment error:', err);
      if (err instanceof BadRequestException) throw err;
      throw new BadRequestException({
        message: AllMessages.SMTHG_WRNG,
        success: false,
      });
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

      const { count: total, rows } = await this.pkgRepo.invoiceModel.findAndCountAll({
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
      throw new BadRequestException({
        message: AllMessages.SMTHG_WRNG,
        success: false,
      });
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
            attributes: ['id', 'firstName', 'lastName', 'email', 'address', 'city', 'state', 'zip', 'country', 'phnNo'],
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
                attributes: ['address1', 'address2', 'province', 'country', 'zip', 'phone'],
              },
            ],
          },
        ],
      });

      if (!invoice)
        throw new BadRequestException({
          message: AllMessages.PAKG_NF,
          success: false,
        });

      return { success: true, data: invoice };
    } catch (err) {
      throw err instanceof BadRequestException ? err : new BadRequestException(AllMessages.SMTHG_WRNG);
    }
  }

  /**
   * @description save pdf url in db
   */
  async savepdf(body: any) {
    try {
      const { pdfUrl, invoiceId } = body;
      if (!pdfUrl)
        throw new BadRequestException({
          message: 'PDF URL is required.',
          success: false,
        });

      const invoice = await this.pkgRepo.invoiceModel.findByPk(invoiceId);
      if (!invoice)
        throw new BadRequestException({
          message: AllMessages.PAKG_NF,
          success: false,
        });

      invoice.pdf_URL = pdfUrl;
      await invoice.save();

      return {
        success: true,
        message: 'PDF URL saved successfully.',
        pdfUrl,
      };
    } catch (err) {
      throw err instanceof BadRequestException ? err : new BadRequestException(AllMessages.SMTHG_WRNG);
    }
  }

  /**
   * @description Mark all items received
   */
  async markAll(body: any) {
    if (!this.pkgRepo.packageOrderModel.sequelize)
      throw new BadRequestException({
        message: 'Sequelize not initialized',
        success: false,
      });
    const t = await this.pkgRepo.packageOrderModel.sequelize.transaction();
    try {
      const { brandIds = [], packageOrderId } = body;
      const order = await this.pkgRepo.packageOrderModel.findOne({
        where: { id: packageOrderId },
      });

      if (order?.status !== PACKAGE_STATUS.CLOSE) {
        await t.rollback();
        throw new BadRequestException({
          message: 'Order not closed yet.',
          success: false,
        });
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
        throw new BadRequestException({
          message: 'No items found to mark as received.',
          success: false,
        });
      }

      const itemIds = orderItems.map((item) => item.id);

      // Step 2: Update brand items to mark them as received.
      await this.pkgRepo.packageBrandItemsModel.update(
        { isItemReceived: ORDER_ITEMS.ITM_RECEIVED },
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
      if (packageOrderId && order?.store_id) {
        this.socketGateway.server.emit(`updateQty-${order.store_id}-${packageOrderId}`);
      }

      return { success: true, message: AllMessages.ALL_ITM_RCVD };
    } catch (err) {
      if (t) await t.rollback();
      console.error('❌ markAll:', err);
      throw err instanceof BadRequestException ? err : new BadRequestException(AllMessages.SMTHG_WRNG);
    }
  }

  /**
   * @description Update shortage quantities for package items
   */
  async shortageQuantities(body: DTO.ShortageQuantityDto) {
    if (!this.pkgRepo.packageOrderModel.sequelize)
      throw new BadRequestException({
        message: 'Sequelize not initialized',
        success: false,
      });
    const t = await this.pkgRepo.packageOrderModel.sequelize.transaction();
    try {
      const { packageOrderId, itemsArr = [] } = body;
      const order = await this.pkgRepo.packageOrderModel.findOne({
        where: { id: packageOrderId },
        include: [{ model: this.storeRepo.storeModel, as: 'store' }],
      });

      if (order?.status !== PACKAGE_STATUS.CLOSE) {
        throw new BadRequestException({
          message: 'Order not closed yet.',
          success: false,
        });
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
        if (isItemReceived != null) itemStatusMap.set(packageItemId, isItemReceived);

        for (const { size, receivedQuantity, selectedQuantity } of variants) {
          const received = Number(receivedQuantity) || 0;
          const selected = Number(selectedQuantity) || 0;
          updateOperations.push({
            receivedQuantity: received,
            shortage: selected - received,
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
        this.socketGateway.server.emit(`updateQty-${anyOrder.store.store_id}-${packageOrderId}`);
      }

      return { success: true, message: AllMessages.SHRTG_QTY };
    } catch (err) {
      if (t && !(t as { finished?: boolean }).finished) {
        await t.rollback();
      }
      console.error('❌ shortageQuantities error:', err);
      throw err instanceof BadRequestException ? err : new BadRequestException(AllMessages.SMTHG_WRNG);
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
      if (!adminRole)
        throw new BadRequestException({
          message: 'Admin role not found.',
          success: false,
        });

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
      throw new BadRequestException({
        message: AllMessages.SMTHG_WRNG,
        success: false,
      });
    }
  }

  /**
   * @description Mark order Complete
   */
  async completePkg(user: any, orderId: number, body: any) {
    if (!this.pkgRepo.packageOrderModel.sequelize)
      throw new BadRequestException({
        message: 'Sequelize not initialized',
        success: false,
      });
    const t = await this.pkgRepo.packageOrderModel.sequelize.transaction();
    try {
      const pkgOrder = await this.pkgRepo.packageOrderModel.findOne({
        where: { id: orderId },
      });
      if (!pkgOrder) {
        await t.rollback();
        throw new NotFoundException({
          success: false,
          message: AllMessages.PAKG_NF,
        });
      }

      if (pkgOrder.status === PACKAGE_STATUS.COMPLETED) {
        await t.rollback();
        return { success: true, message: 'Package is already marked as completed.' };
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
      const { pDate, storeId = '', locationId = '' } = body;
      setImmediate(async () => {
        try {
          await this.ConsumerInventoryHelper.consumerInventoryBackground(
            orderId,
            user.userId,
            user.roleId,
            pDate,
            storeId,
            user.token,
            locationId,
          );
          console.log(`ConsumerInventory processed for order ${orderId}`);
        } catch (err) {
          console.error('Background ConsumerInventory failed:', err);
        }
      });

      return { success: true, message: AllMessages.PKG_CMPLTD };
    } catch (err) {
      await t.rollback();
      console.error('❌ completePkg error:', err);
      if (err instanceof NotFoundException || err instanceof BadRequestException) throw err;
      throw new BadRequestException({
        success: false,
        message: AllMessages.SMTHG_WRNG,
      });
    }
  }

  /**
   * @description Package slip pdf all data (Invoice)
   */
  async packageSlip(user: any, body: any) {
    try {
      const { orderId, brandIds = [] } = body;

      const packageOrderData = await this.pkgRepo.packageOrderModel.findByPk(orderId, {
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
      });

      if (!packageOrderData) throw new BadRequestException('Package order not found');

      const packageOrderItems = await this.pkgRepo.packageBrandItemsModel.findAll({
        where: { packageBrand_id: { [Op.in]: brandIds } },
        include: [
          {
            model: this.productRepo.productListModel,
            as: 'products',
            include: [{ model: this.productRepo.brandModel, as: 'brandData' }],
          },
          {
            model: this.pkgRepo.packageBrandItemsCapacityModel,
            as: 'capacities',
            include: [
              {
                model: this.productRepo.variantModel,
                as: 'variant',
                include: [{ model: this.productRepo.inventoryModel, as: 'inventory' }],
              },
            ],
          },
          {
            model: this.pkgRepo.packageBrandItemsQtyModel,
            as: 'sizeQuantities',
          },
        ],
      });

      if (!packageOrderItems.length) throw new BadRequestException(AllMessages.PAKG_NF);

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
          sizeLocationMap[sizeKey] = variant.location != null ? String(variant.location).trim() : 'N/A';

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
          sizeAndQuantity[sizeKey].receivedQuantity = qty.receivedQuantity ?? selected;
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
      throw err instanceof BadRequestException ? err : new BadRequestException(AllMessages.SMTHG_WRNG);
    }
  }

  /**
   * @description Generate custom invoice.
   */
  async customInvoice(user: any, body: any) {
    if (!this.pkgRepo.packageOrderModel.sequelize)
      throw new BadRequestException({
        message: 'Sequelize not initialized',
        success: false,
      });
    const t = await this.pkgRepo.packageOrderModel.sequelize.transaction();
    try {
      const { email, billToDetails = {}, totalAmount, receivedAmount, invoiceDate, invoiceItems = [] } = body;
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
        if (Object.keys(fieldsToUpdate).length > 0) await consumer.update(fieldsToUpdate, { transaction: t });
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
        draft: false,
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
      throw err instanceof BadRequestException ? err : new BadRequestException(AllMessages.SMTHG_WRNG);
    }
  }

  async defaultLocation(storeId: number) {
    try {
      const locations = await this.storeRepo.storeLocationMappingModel.findAll({
        where: { store_id: storeId },
      });

      if (locations.length > 1) {
        return {
          success: true,
          message: 'This store have multiple locations.',
          showStoreList: true,
          locations,
        };
      }

      if (locations.length === 1) {
        return {
          success: true,
          message: 'This store have single location.',
          showStoreList: false,
          storeId: locations[0]?.store_id,
          locationId: locations[0]?.id,
        };
      }

      throw new BadRequestException({ success: false, message: AllMessages.SMTHG_WRNG });
    } catch (err) {
      console.error('❌ defaultLocation:', err);
      throw new BadRequestException({ success: false, message: AllMessages.SMTHG_WRNG });
    }
  }

  async sendInvoiceToConsumer(user: getUser, body: { orderId: number; pdfBase64: string }) {
    try {
      const { orderId, pdfBase64 } = body;
      const { storeId } = user;

      if (!orderId || !pdfBase64) {
        throw new BadRequestException({
          success: false,
          message: 'Order ID and PDF Base64 string are required.',
        });
      }

      const packageOrderData: any = await this.pkgRepo.packageOrderModel.findByPk(orderId, {
        include: [
          {
            model: this.storeRepo.storeModel,
            as: 'store',
            attributes: ['store_name', 'store_code', 'store_icon', 'store_id'],
          },
          {
            model: this.pkgRepo.packageCustomerModel,
            as: 'customers',
            include: [{ model: this.userRepo.userModel, as: 'customer' }],
          },
        ],
      });

      if (!packageOrderData) {
        throw new BadRequestException({ success: false, message: 'Package order not found' });
      }

      const customer = packageOrderData.customers?.[0]?.customer;
      if (!customer?.email) {
        throw new BadRequestException({
          success: false,
          message: 'Customer email not found for this order.',
        });
      }

      const store = packageOrderData.store;

      const { html, subject } = this.mailService.getPopulatedTemplate(TemplatesSlug.SendInvoiceToConsumer, {
        project: process.env.PROJECT_NAME,
        orderNo: packageOrderData.order_id,
        storeName: store?.store_name || 'Our Store',
        supportEmail: process.env.SUPPORT_EMAIL,
        frontendURL: process.env.FRONTEND_URL || '',
        storeLogo: store?.store_icon || '',
        oneSyncLogo: process.env.ONE_SYNC_LOGO,
        twitterLink: '#',
        fbLink: '#',
        instaLink: '#',
      });

      const base64Data = pdfBase64.includes('base64,') ? pdfBase64.split('base64,')[1] : pdfBase64;

      const attachments = [
        {
          content: base64Data,
          filename: `Invoice_${packageOrderData.order_id}.pdf`,
          type: 'application/pdf',
          disposition: 'attachment',
        },
      ];

      const sendMailResult = await this.mailService.sendMail(
        customer.email,
        html,
        subject,
        store?.store_id,
        attachments,
      );

      if (!sendMailResult.success) {
        throw new BadRequestException({
          success: false,
          message: sendMailResult.error || 'Failed to send email via SendGrid.',
        });
      }

      return {
        success: true,
        message: 'Invoice successfully sent to consumer email.',
      };
    } catch (error) {
      console.error('❌ sendInvoiceToConsumer error:', error);
      if (error instanceof BadRequestException) throw error;
      throw new BadRequestException({ success: false, message: 'Failed to send invoice.' });
    }
  }
}
