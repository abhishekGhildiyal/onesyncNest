import { Injectable, Logger } from '@nestjs/common';
import { Op, QueryTypes, Transaction } from 'sequelize';
import { Sequelize } from 'sequelize-typescript';
import { VARIANT_STATUS } from 'src/common/constants/enum';
import { OrderRepository } from 'src/db/repository/order.repository';
import { ProductRepository } from 'src/db/repository/product.repository';
import { Store } from 'src/db/entities/store/store';
import { UserRepository } from 'src/db/repository/user.repository';
import { ShopifyService, ShopifyServiceFactory } from 'src/modules/shopify/shopify.service';

const CHARACTERS = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';

function generateUniqueId(length: number): string {
  let uniqueId = '';
  for (let i = 0; i < length; i++) {
    uniqueId += CHARACTERS.charAt(Math.floor(Math.random() * CHARACTERS.length));
  }
  return uniqueId;
}

@Injectable()
export class ShopifyOrderWebhookHelper {
  private readonly logger = new Logger(ShopifyOrderWebhookHelper.name);

  constructor(
    private readonly orderRepo: OrderRepository,
    private readonly productRepo: ProductRepository,
    private readonly userRepo: UserRepository,
    private readonly sequelize: Sequelize,
    private readonly shopifyFactory: ShopifyServiceFactory,
  ) {}

  async processOrderCreate(payload: any, store: Store) {
    const shopifyOrderId = payload.id;
    const orderCreatedAt = payload.created_at ? new Date(payload.created_at) : new Date();
    const lineItems = Array.isArray(payload.line_items) ? payload.line_items : [];

    let sourceName = payload.source_name || 'web';
    if (Array.isArray(payload.note_attributes)) {
      let gPlatform: string | null = null;
      let marketplaceId: string | null = null;
      for (const attr of payload.note_attributes) {
        const name = String(attr.name || '').toLowerCase().trim();
        const value = attr.value ? String(attr.value).trim() : '';
        if (name === 'g_platform' && value) gPlatform = value;
        if (name === 'marketplace_id' && value) marketplaceId = value;
      }
      if (gPlatform) sourceName = gPlatform;
      else if (marketplaceId) sourceName = marketplaceId;
    }

    const existingOrder = await this.orderRepo.ordersModel.findOne({
      where: { shopifyOrderId, storeId: store.store_id },
    });
    if (existingOrder) {
      return { ok: false, reason: 'order_already_exists', soldCount: 0, shopifyOrderId };
    }

    let paymentStatus = payload.financial_status || 'Unpaid';
    if (paymentStatus.toLowerCase() === 'paid') paymentStatus = 'Paid';
    else if (paymentStatus.toLowerCase() === 'pending') paymentStatus = 'Payment pending';

    let orderDiscountType: number | null = null;
    let orderDiscountValue = 0;
    let discountReason: string | null = null;
    const discApps = payload.discount_applications;
    if (Array.isArray(discApps) && discApps.length) {
      const d = discApps[0];
      discountReason = d.title || null;
      orderDiscountValue = parseFloat(d.value) || 0;
      orderDiscountType = d.value_type === 'percentage' ? 0 : 1;
    }

    const shippingLine =
      Array.isArray(payload.shipping_lines) && payload.shipping_lines.length ? payload.shipping_lines[0] : null;
    const shippingAmount = shippingLine ? parseFloat(shippingLine.price) || 0 : null;
    const shippingName = shippingLine?.title || null;

    const soldInventoryIds = new Set<number>();
    const productIdsForSync = new Set<number>();
    let soldCount = 0;
    let localOrder: any = null;
    let channelRecord: any = null;
    let customerId: number | null = null;

    const transaction = await this.sequelize.transaction();

    try {
      channelRecord = await this.resolveChannel(sourceName, store, transaction);

      customerId = await this.resolveCustomer(payload, store, transaction);

      let billingAddressId: number | null = null;
      let shippingAddressId: number | null = null;

      if (payload.billing_address) {
        const b = payload.billing_address;
        const billing = await this.orderRepo.addressesModel.create(
          {
            customer_id: customerId,
            first_name: b.first_name || '',
            last_name: b.last_name || '',
            address: b.address1 || '',
            apartment: b.address2 || null,
            city: b.city || '',
            state: b.province || null,
            zip_code: b.zip || '',
            country: b.country || '',
            phone_number: b.phone || 'N/A',
            label_name: b.company || 'N/A',
          },
          { transaction },
        );
        billingAddressId = billing.id;
      }

      if (payload.shipping_address) {
        const s = payload.shipping_address;
        const shipping = await this.orderRepo.addressesModel.create(
          {
            customer_id: customerId,
            first_name: s.first_name || '',
            last_name: s.last_name || '',
            address: s.address1 || '',
            apartment: s.address2 || null,
            city: s.city || '',
            state: s.province || null,
            zip_code: s.zip || '',
            country: s.country || '',
            phone_number: s.phone || 'N/A',
            label_name: s.company || 'N/A',
          },
          { transaction },
        );
        shippingAddressId = shipping.id;
      }

      await this.sequelize.query(
        'UPDATE store_order_sequence SET sequence_value = sequence_value + 1 WHERE store_id = :storeId',
        { replacements: { storeId: store.store_id }, transaction },
      );
      const [seqRow] = (await this.sequelize.query(
        'SELECT sequence_value FROM store_order_sequence WHERE store_id = :storeId',
        { replacements: { storeId: store.store_id }, transaction, type: QueryTypes.SELECT },
      )) as any[];
      if (!seqRow?.sequence_value) {
        throw new Error(`Order sequence not initialized for store ${store.store_id}`);
      }
      const storeOrderId = `O${store.store_code}${seqRow.sequence_value}`;

      localOrder = await this.orderRepo.ordersModel.create(
        {
          shopifyOrderId,
          storeOrderId,
          orderNumber: String(payload.order_number || ''),
          paymentStatus,
          financialStatus: payload.financial_status || null,
          fulfillmentStatus: 'Unfulfilled',
          mode: 'Shipping',
          orderSource: 'Shopify',
          orderType: 'Retail order',
          channel: sourceName,
          channelId: channelRecord?.id || null,
          customerId,
          billingAddressId,
          shippingAddressId,
          storeId: store.store_id,
          tags: payload.tags || null,
          orderNote: payload.note || null,
          totalPrice: parseFloat(payload.total_price) || 0,
          finalPrice: parseFloat(payload.current_total_price || payload.total_price) || 0,
          totalDiscount: parseFloat(payload.total_discounts) || 0,
          itemCount: lineItems.length,
          orderStatus: 'Open',
          orderDiscountType,
          orderDiscountValue,
          orderDiscountTypeJpa: orderDiscountType,
          orderDiscountValueJpa: orderDiscountValue,
          discountReason,
          discountReasonJpa: discountReason,
          shippingAmount,
          shippingName,
          shippingAmountJpa: shippingAmount,
          shippingNameJpa: shippingName,
          fulfillmentSequence: 0,
          inventoryReverted: false,
          createdAt: orderCreatedAt,
        },
        { transaction },
      );

      let shopifyServiceForLookup: ShopifyService | null = null;
      if (store.shopify_store && store.shopify_token) {
        try {
          shopifyServiceForLookup = this.shopifyFactory.createService(store);
        } catch (err) {
          this.logger.warn(`Shopify lookup client unavailable: ${err.message}`);
        }
      }

      for (const li of lineItems) {
        const shopifyVariantId = li.variant_id;
        const shopifyProductId = li.product_id;
        if (!shopifyVariantId || !shopifyProductId) continue;

        let variant = await this.productRepo.variantModel.findOne({
          where: {
            store_id: store.store_id,
            [Op.or]: [{ variant_id: shopifyVariantId }, { webVariantId: shopifyVariantId }],
          },
          include: [
            {
              model: this.productRepo.inventoryModel,
              as: 'inventory',
              required: true,
              include: [{ model: this.userRepo.userModel, as: 'user', required: false }],
            },
          ],
          transaction,
          lock: transaction.LOCK.UPDATE,
        });

        if (!variant && shopifyServiceForLookup) {
          const shopifyVariant = await shopifyServiceForLookup.getVariantDetailsFromShopify(shopifyVariantId);
          const barcode = shopifyVariant?.barcode ? String(shopifyVariant.barcode).trim() : '';
          if (barcode) {
            variant = await this.productRepo.variantModel.findOne({
              where: {
                store_id: store.store_id,
                [Op.or]: [{ barcode }, { web_barcode: barcode }, { migrationId: barcode }],
              },
              include: [
                {
                  model: this.productRepo.inventoryModel,
                  as: 'inventory',
                  required: true,
                  include: [{ model: this.userRepo.userModel, as: 'user', required: false }],
                },
              ],
              transaction,
              lock: transaction.LOCK.UPDATE,
            });
          }
        }

        if (!variant || variant.status !== VARIANT_STATUS.ACTIVE) continue;

        const qty = li.current_quantity ?? li.quantity ?? 1;
        const price = parseFloat(li.price) || 0;
        let finalPrice = price;
        let lineDiscountType: number | null = null;
        let lineDiscountValue = 0;
        let lineDiscountReason: string | null = null;

        if (Array.isArray(li.discount_allocations) && li.discount_allocations.length && Array.isArray(discApps)) {
          const alloc = li.discount_allocations[0];
          const appIdx = alloc.discount_application_index;
          if (appIdx != null && discApps[appIdx]) {
            const discApp = discApps[appIdx];
            lineDiscountReason = discApp.title || null;
            lineDiscountValue = parseFloat(alloc.amount) || 0;
            if (discApp.value_type === 'fixed_amount') {
              lineDiscountType = 1;
              finalPrice = Math.max(0, price - lineDiscountValue);
            } else if (discApp.value_type === 'percentage') {
              lineDiscountType = 0;
              const pct = parseFloat(discApp.value) || 0;
              finalPrice = price * ((100 - pct) / 100);
            }
          }
        }

        let payout = variant.payout || 0;
        if (Number(variant.accountType) === 1) {
          if (!payout || payout !== finalPrice) payout = finalPrice;
        } else if (!store.is_discount) {
          const fee = variant.fee || 0;
          payout = finalPrice - (finalPrice * fee) / 100;
        }

        const originalPrice = variant.price || 0;

        await variant.update(
          {
            status: VARIANT_STATUS.SOLD,
            quantity: 0,
            order_id: shopifyOrderId,
            is_shopify_order: true,
            soldSource: '1',
            source_name: sourceName,
            channelId: channelRecord?.id || null,
            ...(store.is_discount ? {} : { price: finalPrice }),
            payout,
            discount: originalPrice - finalPrice,
          },
          { transaction },
        );

        await (variant as any).inventory.update(
          { soldOn: orderCreatedAt, shopifyStatus: 'Sold' },
          { transaction },
        );

        await this.orderRepo.orderItemsModel.create(
          {
            orderId: shopifyOrderId,
            orderLink: localOrder.id,
            itemId: li.id,
            productId: shopifyProductId,
            variantId: shopifyVariantId,
            quantity: qty,
            price,
            finalPrice,
            status: qty === 0 ? 'Done' : 'Active',
            createdDate: new Date().toISOString(),
            inventoryItemId: (variant as any).inventory.id,
            itemName: (variant as any).inventory.itemName,
            displayName: li.name || li.title,
            sku: li.sku || null,
            barcode: variant.barcode || null,
            webBarcode: variant.web_barcode || null,
            size: variant.option1Value || null,
            itemCondition: variant.option2Value || null,
            location: variant.location || null,
            customVariantId: variant.custom_variant_id || null,
            image: (variant as any).inventory.image || null,
            weight: variant.weight || null,
            orderDate: orderCreatedAt,
            storeId: store.store_id,
            fulfillmentStatus: 'Unfulfilled',
            paymentStatus,
            discountType: lineDiscountType,
            discountValue: lineDiscountValue,
            discountReason: lineDiscountReason,
            sellerEmail:
              Number(variant.accountType) === 1 ? 'Store Account' : (variant as any).inventory.user?.email || null,
          },
          { transaction },
        );

        soldInventoryIds.add((variant as any).inventory.id);
        if (variant.productId) productIdsForSync.add(variant.productId);
        soldCount += 1;
      }

      if (soldCount === 0) {
        await transaction.rollback();
        return { ok: false, reason: 'no_matching_variants', soldCount: 0 };
      }

      await transaction.commit();
    } catch (err) {
      await transaction.rollback();
      throw err;
    }

    await this.updateOrderNotes(payload, store, shopifyOrderId, localOrder);

    if (soldInventoryIds.size > 0) {
      await this.cleanupShopifyInventory(store, soldInventoryIds, productIdsForSync);
    }

    return {
      ok: true,
      soldCount,
      shopifyOrderId,
      localOrderId: localOrder.id,
      storeOrderId: localOrder.storeOrderId,
      customerId,
      channelId: channelRecord?.id || null,
    };
  }

  async processOrderCancel(payload: any, store: Store) {
    const shopifyOrderId = payload.id;
    const transaction = await this.sequelize.transaction();
    const productIdsForSync = new Set<number>();
    const inventoriesToSync: any[] = [];

    try {
      const order = await this.orderRepo.ordersModel.findOne({
        where: { shopifyOrderId, storeId: store.store_id },
        transaction,
      });
      if (!order) {
        await transaction.rollback();
        return { ok: false, reason: 'order_not_found', shopifyOrderId };
      }

      await order.update({ orderStatus: 'Cancelled', fulfillmentStatus: 'Removed' }, { transaction });

      const items = await this.orderRepo.orderItemsModel.findAll({
        where: { orderId: shopifyOrderId },
        transaction,
      });

      for (const item of items) {
        await item.update({ status: 'Cancelled', fulfillmentStatus: 'Removed' }, { transaction });
        if (!item.barcode) continue;

        const variant = await this.productRepo.variantModel.findOne({
          where: { barcode: item.barcode, store_id: store.store_id },
          include: [{ model: this.productRepo.inventoryModel, as: 'inventory', required: true }],
          transaction,
        });

        if (variant && variant.status === VARIANT_STATUS.SOLD) {
          const price = variant.price || 0;
          const payout = Number(variant.accountType) === 1 ? price : price - (price * (variant.fee || 0)) / 100;

          await variant.update(
            {
              status: VARIANT_STATUS.ACTIVE,
              quantity: 1,
              order_id: null,
              is_shopify_order: false,
              soldSource: '0',
              source_name: null,
              channelId: null,
              discount: null,
              payout,
            },
            { transaction },
          );

          await this.sequelize.query('UPDATE variant SET channel_id = NULL, source_name = NULL WHERE id = :id', {
            replacements: { id: variant.id },
            transaction,
          });

          await (variant as any).inventory.update({ soldOn: null, shopifyStatus: 'Listed' }, { transaction });

          if ((variant as any).inventory.id) inventoriesToSync.push((variant as any).inventory);
          if (variant.productId) productIdsForSync.add(variant.productId);
        } else if (variant && variant.status === VARIANT_STATUS.PAID) {
          const alreadyCreated = await this.productRepo.inventoryModel.findOne({
            where: { sourceOrderItemId: item.id },
            transaction,
          });
          if (alreadyCreated) continue;

          await variant.update(
            {
              webVariantId: null,
              webInventoryItemId: null,
              variant_id: null,
              variant_inventory_id: null,
            },
            { transaction },
          );

          const storeMapping = await this.userRepo.userStoreMappingModel.findOne({
            where: { storeId: store.store_id, roleId: 2 },
            transaction,
          });
          const storeAdminId = storeMapping ? storeMapping.userId : null;

          const nextSeq = await this.getNextSequenceId(store.store_id, transaction);
          const nextBarcode = `C${store.store_code}${nextSeq}`;
          const newWebBarcode = generateUniqueId(10);

          const oldInv = (variant as any).inventory;
          const newInv = await this.productRepo.inventoryModel.create(
            {
              itemName: oldInv.itemName,
              skuNumber: oldInv.skuNumber,
              brand: oldInv.brand,
              color: oldInv.color,
              category: oldInv.category,
              type: oldInv.type,
              image: oldInv.image,
              template: oldInv.template,
              sourceOrderItemId: item.id,
              webBarcode: newWebBarcode,
              displayName: `${nextBarcode} ${oldInv.itemName || ''}`.trim(),
              storeId: store.store_id,
              accountType: 1,
              publishedScope: 'global',
              user_id: storeAdminId,
              productId: variant.productId,
            },
            { transaction },
          );

          const newVar = await this.productRepo.variantModel.create(
            {
              option1: variant.option1,
              option1Value: variant.option1Value,
              option2: variant.option2,
              option2Value: variant.option2Value,
              option3: variant.option3,
              option3Value: variant.option3Value,
              price: item.price,
              payout: item.price,
              cost: variant.payout,
              status: VARIANT_STATUS.ACTIVE,
              quantity: 1,
              original_quantity: 1,
              custom_variant_id: nextBarcode,
              barcode: nextBarcode,
              web_barcode: newWebBarcode,
              inventoryId: newInv.id,
              productId: variant.productId,
              user_id: storeAdminId,
              accountType: 1,
              storeLocationMappingId: variant.storeLocationMappingId,
              location: variant.location,
              location_id: variant.location_id,
              weight: variant.weight,
              store_id: store.store_id,
            },
            { transaction },
          );

          inventoriesToSync.push(newInv);
          if (variant.productId) productIdsForSync.add(variant.productId);
          void newVar;
        }
      }

      await transaction.commit();
    } catch (err) {
      await transaction.rollback();
      throw err;
    }

    if (productIdsForSync.size > 0 && !store.is_used_only_products_store) {
      this.logger.warn(
        `[processOrderCancel] Web inventory sync skipped for product IDs: ${[...productIdsForSync].join(', ')}`,
      );
    }

    try {
      const shopifyRESTService = this.shopifyFactory.createService(store);
      await shopifyRESTService.updateShopifyOrderNotes(shopifyOrderId, '');
    } catch (err) {
      this.logger.error(`cancel notes clear fail: ${err.message}`);
    }

    return { ok: true, shopifyOrderId, action: 'cancelled' };
  }

  private async resolveChannel(sourceName: string, store: Store, transaction: Transaction) {
    if (sourceName && /^\d+$/.test(sourceName)) {
      let channelRecord = await this.orderRepo.channelModel.findOne({
        where: { marketPlaceId: sourceName, storeId: store.store_id },
        transaction,
      });
      if (!channelRecord) {
        channelRecord = await this.orderRepo.channelModel.create(
          {
            marketPlaceId: sourceName,
            isShopifyChannel: true,
            isDynamic: true,
            channelSoldSource: '1',
            storeId: store.store_id,
          },
          { transaction },
        );
      } else if (channelRecord.channelName) {
        sourceName = channelRecord.channelName;
      }
      return channelRecord;
    }

    if (!sourceName) return null;

    let channelRecord = await this.orderRepo.channelModel.findOne({
      where: { channelName: sourceName, storeId: store.store_id, isShopifyChannel: true },
      transaction,
    });
    if (!channelRecord) {
      channelRecord = await this.orderRepo.channelModel.create(
        {
          channelName: sourceName,
          isShopifyChannel: true,
          isDynamic: true,
          channelSoldSource: '1',
          storeId: store.store_id,
        },
        { transaction },
      );
    }
    return channelRecord;
  }

  private async resolveCustomer(payload: any, store: Store, transaction: Transaction): Promise<number | null> {
    let cObj = payload.customer;
    if (!cObj && (payload.billing_address || payload.shipping_address)) {
      const addr = payload.billing_address || payload.shipping_address;
      cObj = {
        first_name: addr.first_name || '',
        last_name: addr.last_name || '',
        phone: addr.phone || null,
        email: payload.email || payload.contact_email || null,
      };
    }
    if (!cObj || typeof cObj !== 'object') return null;

    const shopifyCustomerId = cObj.id || null;
    const email = cObj.email ? String(cObj.email).trim() : null;
    let customer: any = null;

    if (shopifyCustomerId) {
      customer = await this.orderRepo.customersModel.findOne({
        where: { shopify_customer_id: shopifyCustomerId },
        transaction,
      });
    }
    if (!customer && email) {
      customer = await this.orderRepo.customersModel.findOne({ where: { email }, transaction });
    }
    if (!customer) {
      customer = await this.orderRepo.customersModel.create(
        {
          shopify_customer_id: shopifyCustomerId,
          email,
          first_name: cObj.first_name || '',
          last_name: cObj.last_name || '',
          phone_number: cObj.phone ? String(cObj.phone).trim() : null,
        },
        { transaction },
      );
    } else {
      const updates: Record<string, unknown> = {};
      if (!customer.shopify_customer_id && shopifyCustomerId) updates.shopify_customer_id = shopifyCustomerId;
      if ((!customer.first_name || customer.first_name === '') && cObj.first_name) updates.first_name = cObj.first_name;
      if ((!customer.last_name || customer.last_name === '') && cObj.last_name) updates.last_name = cObj.last_name;
      if (!customer.phone_number && cObj.phone) updates.phone_number = String(cObj.phone).trim();
      if (Object.keys(updates).length > 0) await customer.update(updates, { transaction });
    }

    const mapping = await this.orderRepo.customerStoreMappingModel.findOne({
      where: { customer_id: customer.id, store_id: store.store_id },
      transaction,
    });
    if (!mapping) {
      await this.orderRepo.customerStoreMappingModel.create(
        {
          customer_id: customer.id,
          store_id: store.store_id,
          status: 1,
          is_email_subscribed: false,
          is_sms_subscribed: false,
          isEmailSubscribed: false,
          isSmsSubscribed: false,
          added_on: new Date(),
        },
        { transaction },
      );
    }

    return customer.id;
  }

  private async updateOrderNotes(payload: any, store: Store, shopifyOrderId: number, localOrder: any) {
    try {
      const orderItems = await this.orderRepo.orderItemsModel.findAll({
        where: { orderId: shopifyOrderId, storeId: store.store_id, status: 'Active' },
      });
      if (!orderItems.length) return;

      let orderNotesStr = '';
      let c = 1;
      for (const item of orderItems) {
        orderNotesStr += `Item #${c++}\n`;
        orderNotesStr += `Barcode: ${item.barcode || 'N/A'}\n`;
        orderNotesStr += `Product: ${item.itemName || 'Unknown'}`;
        if (item.size || item.itemCondition) {
          orderNotesStr += ' (';
          if (item.size) orderNotesStr += item.size;
          if (item.itemCondition) {
            if (item.size) orderNotesStr += ', ';
            orderNotesStr += item.itemCondition;
          }
          orderNotesStr += ')';
        }
        orderNotesStr += `\nLocation: ${item.location || 'N/A'}`;
        if (store.isNotesWithEmail) {
          orderNotesStr += `\nSeller: ${item.sellerEmail || 'N/A'}\n\n`;
        } else {
          orderNotesStr += '\n\n';
        }
      }

      const allowedOrigins = process.env.ALLOWED_ORIGINS || '*';
      const link = `${allowedOrigins}${store.store_domain}/orders/${shopifyOrderId}`;
      orderNotesStr += `\nOrder URL:\n${link}`;
      const notes = orderNotesStr.trim();

      if (notes) {
        await localOrder.update({ shopifyOrderNote: notes });
        const shopifyRESTService = this.shopifyFactory.createService(store);
        await shopifyRESTService.updateShopifyOrderNotes(shopifyOrderId, notes);
      }
    } catch (err) {
      this.logger.error(`Failed to update order notes: ${err.message}`);
    }
  }

  private async cleanupShopifyInventory(store: Store, soldInventoryIds: Set<number>, productIdsForSync: Set<number>) {
    const shopifyService = this.shopifyFactory.createService(store);
    const inventoryItems = await this.productRepo.inventoryModel.findAll({
      where: { id: [...soldInventoryIds], storeId: store.store_id },
      attributes: ['id', 'shopifyId', 'productId'],
    });

    const groupedByProduct = inventoryItems
      .filter((i) => i.shopifyId)
      .reduce(
        (acc, item) => {
          if (!acc[item.productId]) acc[item.productId] = [];
          acc[item.productId].push(item.shopifyId);
          return acc;
        },
        {} as Record<number, string[]>,
      );

    for (const [productId, shopifyIds] of Object.entries(groupedByProduct)) {
      try {
        const deleteResults = await shopifyService.deleteItems(shopifyIds, Number(productId));
        const allCleared = deleteResults.every((r) => r.success || r.message === 'Not found');
        if (allCleared) {
          await this.productRepo.inventoryModel.update(
            { shopifyId: null, shopifyStatus: null },
            { where: { shopifyId: shopifyIds } },
          );
        }
      } catch (err) {
        this.logger.error(`Shopify delete failed for product ${productId}: ${err.message}`);
      }
    }

    if (!store.is_used_only_products_store && productIdsForSync.size > 0) {
      const productIds = [...productIdsForSync];
      const activeCounts = await this.productRepo.variantModel.findAll({
        attributes: ['productId'],
        where: {
          productId: productIds,
          status: VARIANT_STATUS.ACTIVE,
          quantity: { [Op.gt]: 0 },
        },
        group: ['productId'],
      });
      const withActive = new Set(activeCounts.map((v) => v.productId));
      const toSync = productIds.filter((id) => !withActive.has(id));
      if (toSync.length) {
        this.logger.warn(`[processOrderCreate] Web inventory sync skipped for product IDs: ${toSync.join(', ')}`);
      }
    }
  }

  private async getNextSequenceId(storeId: number, transaction: Transaction): Promise<number> {
    const [rows] = await this.sequelize.query(
      'SELECT sequence_value FROM store_barcode_sequence WHERE store_id = :storeId FOR UPDATE',
      { replacements: { storeId }, transaction, type: QueryTypes.SELECT },
    );
    const row = Array.isArray(rows) ? rows[0] : rows;
    let nextValue = 1;
    if ((row as any)?.sequence_value != null) {
      nextValue = Number((row as any).sequence_value) + 1;
      await this.sequelize.query(
        'UPDATE store_barcode_sequence SET sequence_value = :nextValue WHERE store_id = :storeId',
        { replacements: { storeId, nextValue }, transaction },
      );
    } else {
      await this.sequelize.query(
        'INSERT INTO store_barcode_sequence (store_id, sequence_value) VALUES (:storeId, :nextValue)',
        { replacements: { storeId, nextValue }, transaction },
      );
    }
    return nextValue;
  }
}
