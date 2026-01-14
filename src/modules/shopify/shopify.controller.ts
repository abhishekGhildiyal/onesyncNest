import { Body, Controller, Param, Post } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { ShopifyService } from './shopify.service';

import { BadRequestException } from '@nestjs/common';
import { ProductRepository } from 'src/db/repository/product.repository';
import { StoreRepository } from 'src/db/repository/store.repository';

@ApiTags('Shopify')
@Controller('shopify')
export class ShopifyController {
  constructor(
    private readonly shopifyService: ShopifyService,
    private readonly storeRepo: StoreRepository,
    private readonly productrepo: ProductRepository,
  ) {}

  @Post('sync-product/:productId/:storeId')
  async productSync(
    @Param('productId') productId: number,
    @Param('storeId') storeId: number,
  ) {
    try {
      const store = await this.storeRepo.storeModel.findByPk(storeId);
      if (!store) throw new BadRequestException('Store not found');

      const product = await this.productrepo.productListModel.findOne({
        where: { product_id: productId },
        include: [
          { model: this.productrepo.variantModel, as: 'variants' },
          { model: this.productrepo.inventoryModel, as: 'inventories' },
        ],
      });

      if (!product) throw new BadRequestException('Product not found');

      const inventories = (product as any).inventories;
      const variants = (product as any).variants;

      if (!inventories || inventories.length === 0) {
        throw new BadRequestException('Inventory not found');
      }

      // Build basic Shopify payload (simplified - extend as needed)
      const payload = {
        product: {
          title: product.itemName,
          handle: product.handle,
          // Add more fields as per your buildShopifyPayload helper
        },
      };

      const shopifyResponse = await this.shopifyService.syncProduct(
        store,
        payload,
      );

      if (shopifyResponse?.product?.id) {
        const inventoryIds = inventories.map((inv: any) => inv.id);
        await this.productrepo.inventoryModel.update(
          { shopifyId: shopifyResponse.product.id },
          { where: { id: inventoryIds } },
        );
      }

      return { success: true, data: shopifyResponse };
    } catch (err) {
      throw err instanceof BadRequestException
        ? err
        : new BadRequestException(err.message);
    }
  }

  @Post('sold-item/:storeId')
  async soldItem(
    @Param('storeId') storeId: number,
    @Body() body: { itemIds: number[] },
  ) {
    try {
      const { itemIds } = body;
      if (!Array.isArray(itemIds) || itemIds.length === 0) {
        throw new BadRequestException('itemIds array is required.');
      }

      const store = await this.storeRepo.storeModel.findByPk(storeId);
      if (!store) throw new BadRequestException('Store not found.');

      const inventoryItems = await this.productrepo.inventoryModel.findAll({
        where: { id: itemIds, storeId },
      });

      if (inventoryItems.length === 0) {
        throw new BadRequestException('No matching inventory items found.');
      }

      const shopifyProductIds = inventoryItems
        .map((item: any) => item.shopifyId)
        .filter(Boolean);

      if (shopifyProductIds.length === 0) {
        throw new BadRequestException(
          'No items have valid Shopify IDs to delete.',
        );
      }

      const deletionResults = await this.shopifyService.deleteItems(
        store,
        shopifyProductIds,
      );

      return {
        success: true,
        message: 'Shopify items deleted successfully.',
        data: deletionResults,
      };
    } catch (err) {
      throw err instanceof BadRequestException
        ? err
        : new BadRequestException(err.message);
    }
  }
}
