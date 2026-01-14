import { Injectable } from '@nestjs/common';
import { Op } from 'sequelize';
import { PackageRepository } from 'src/db/repository/package.repository';
import { ProductRepository } from 'src/db/repository/product.repository';
import { StoreRepository } from 'src/db/repository/store.repository';
import { ORDER_ITEMS } from '../constants/enum';

@Injectable()
export class ConsumerInventoryHelperService {
  constructor(
    private readonly pkgRepo: PackageRepository,
    private readonly productRepo: ProductRepository,
    private readonly storeRepo: StoreRepository,
  ) {}

  async consumerInventoryBackground(
    orderId: number,
    userId: number,
    roleId: number,
    pDate: string,
    storeId: any = '',
    token = '',
  ) {
    try {
      // 1️⃣ Fetch brands/items/sizes for this package
      const products = await this.pkgRepo.packageBrandModel.findAll({
        where: { package_id: orderId, selected: true },
        include: [
          {
            model: this.pkgRepo.packageBrandItemsModel,
            as: 'items',
            where: { isItemReceived: ORDER_ITEMS.ITM_RECEIVED },
            include: [
              { model: this.productRepo.productListModel, as: 'products' },
              {
                model: this.pkgRepo.packageBrandItemsQtyModel,
                as: 'sizeQuantities',
                where: { receivedQuantity: { [Op.gt]: 0 } },
                attributes: [
                  'variant_size',
                  'item_id',
                  'maxCapacity',
                  'selectedCapacity',
                  'shortage',
                  'receivedQuantity',
                ],
              },
              {
                model: this.pkgRepo.packageBrandItemsCapacityModel,
                as: 'capacities',
                attributes: ['id', 'item_id', 'variant_id'],
              },
            ],
          },
        ],
      });

      // 2️⃣ Get store details
      const storeDetail = await this.pkgRepo.packageOrderModel.findOne({
        where: { id: orderId },
        include: [
          {
            model: this.storeRepo.storeModel,
            as: 'store',
            attributes: ['store_name', 'store_id'],
          },
        ],
      });

      if (storeId && (!Array.isArray(storeId) || storeId.length > 0)) {
        await this.processStoreInventoryAPI(
          orderId,
          userId,
          roleId,
          pDate,
          storeId,
          products,
          token,
        );
      } else {
        await this.processConsumerInventoryLocal(
          orderId,
          userId,
          pDate,
          products,
          storeDetail,
        );
      }
    } catch (err) {
      console.error('❌ Error in consumerInventoryBackground:', err);
      throw err;
    }
  }

  private async processConsumerInventoryLocal(
    orderId: number,
    userId: number,
    pDate: string,
    products: any[],
    storeDetail: any,
  ) {
    const customerInventoryEntries: any[] = [];
    const consumerProductEntries: any[] = [];
    const variantEntries: any[] = [];
    const productIdMapping = new Map();

    // Step 1️⃣ — Prepare Consumer Product Entries
    for (const brand of products) {
      for (const item of brand.items) {
        if (item.products) {
          consumerProductEntries.push({
            skuNumber: item.products.skuNumber,
            itemName: item.products.itemName,
            image: item.products.image,
            category: item.products.category,
            brand: item.products.brand,
            brand_id: item.products.brand_id,
            template: item.products.template,
            color: item.products.color,
            handle: item.products.handle,
            description: item.products.description,
            type: item.products.type,
            originalProductId: item.products.product_id,
          });
        }
      }
    }

    if (consumerProductEntries.length > 0) {
      await this.pkgRepo.consumerProductModel.bulkCreate(
        consumerProductEntries,
        {
          ignoreDuplicates: true,
        },
      );

      const allProducts = await this.pkgRepo.consumerProductModel.findAll({
        where: {
          skuNumber: consumerProductEntries.map((p: any) => p.skuNumber),
        },
      });

      allProducts.forEach((product: any) => {
        const entry = consumerProductEntries.find(
          (p: any) => p.skuNumber === product.skuNumber,
        );
        if (entry)
          productIdMapping.set(entry.originalProductId, product.product_id);
      });

      const consumerProductMappings = Array.from(productIdMapping.values()).map(
        (newProductId) => ({
          consumerId: userId,
          productId: newProductId,
        }),
      );

      await this.pkgRepo.consumerProductsMappingModel.bulkCreate(
        consumerProductMappings as any,
        {
          ignoreDuplicates: true,
        },
      );
    }

    // Step 2️⃣ — Create Consumer Variant & Inventory Entries
    for (const brand of products) {
      for (const item of brand.items) {
        if (!item.products) continue;

        const consumerProductId = productIdMapping.get(
          item.products.product_id,
        );
        if (!consumerProductId) continue;

        for (const qty of item.sizeQuantities || []) {
          variantEntries.push({
            size: qty.variant_size,
            price: item.price || 0,
            purchase_date: pDate,
            purchase_from_vendor: storeDetail?.store?.store_name,
            package_id: orderId,
            original_quantity: qty.maxCapacity,
            selected_quantity: qty.selectedCapacity,
            received_quantity: qty.receivedQuantity,
            productId: consumerProductId,
            originalProductId: item.products.product_id,
            user_id: userId,
          });

          for (let i = 0; i < qty.receivedQuantity; i++) {
            customerInventoryEntries.push({
              packageId: orderId,
              consumerId: userId,
              skuNumber: item.products.skuNumber,
              productId: consumerProductId,
              size: qty.variant_size,
              type: item.products.type,
              location: null,
              price: item.price || 0,
              status: 'Active',
              acceptedOn: pDate,
            });
          }
        }
      }
    }

    if (variantEntries.length) {
      await this.pkgRepo.consumerProductVariantModel.bulkCreate(
        variantEntries as any,
        {
          ignoreDuplicates: true,
        },
      );
    }

    if (customerInventoryEntries.length) {
      await this.pkgRepo.consumerInventoryModel.bulkCreate(
        customerInventoryEntries as any,
      );
    }
  }

  private async processStoreInventoryAPI(
    orderId: number,
    userId: number,
    roleId: number,
    pDate: string,
    storeId: any,
    products: any[],
    token: string,
  ) {
    const inventoryPayloadMap = new Map();

    for (const brand of products) {
      for (const item of brand.items) {
        if (!item.products) continue;

        const sku = item.products.skuNumber;

        if (!inventoryPayloadMap.has(sku)) {
          inventoryPayloadMap.set(sku, {
            itemName: item.products.itemName,
            image: item.products.image,
            brand: item.products.brand,
            color: item.products.color,
            description: item.products.description || null,
            category: item.products.category,
            template: item.products.template,
            templateRequired: false,
            condition: null,
            location: null,
            status: null,
            skuNumber: sku,
            variant: [],
          });
        }

        const productPayload = inventoryPayloadMap.get(sku);

        for (const qty of item.sizeQuantities || []) {
          if (!qty.receivedQuantity || qty.receivedQuantity <= 0) continue;

          productPayload.variant.push({
            quantity: qty.receivedQuantity,
            option1: 'Size',
            option1Value: qty.variant_size,
            option2: 'Condition',
            option2Value: null,
            status: '4',
            location: null,
            price: item.price || 0,
            cost: '0',
            purchaseDate: pDate || null,
            customFields: [],
          });
        }
      }
    }

    const inventoryPayload = Array.from(inventoryPayloadMap.values());

    const response = await fetch(
      'https://onesync-api-50c03c74d4bf.herokuapp.com/onesync.test/addInventories',
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Accept: 'application/json',
          Authorization: token,
          roleId: String(roleId),
          userId: String(userId),
          storeId: String(storeId),
        },
        body: JSON.stringify(inventoryPayload),
      },
    );

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Failed to process store inventory API: ${errorText}`);
    }
  }
}
