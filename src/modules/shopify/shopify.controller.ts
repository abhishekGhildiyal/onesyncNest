import { BadRequestException, Body, Controller, Get, Param, Post, UseGuards } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { GetUser } from 'src/common/decorators/get-user.decorator';
import { AuthGuard } from 'src/common/guards/auth.guard';
import type { getUser } from 'src/common/interfaces/common/getUser';
import { AllMessages } from 'src/common/constants/messages';
import { ProductRepository } from 'src/db/repository/product.repository';
import { StoreRepository } from 'src/db/repository/store.repository';
import { buildShopifyPayload } from './shopify.helper';
import { shopifyGraphqlRequest } from './shopify-graphql.client';
import { ShopifyServiceFactory } from './shopify.service';

@ApiTags('Shopify')
@Controller('shopify')
export class ShopifyController {
  constructor(
    private readonly storeRepo: StoreRepository,
    private readonly productrepo: ProductRepository,
    private readonly shopifyFactory: ShopifyServiceFactory,
  ) {}

  /**
   * @description Sync product to shopify
   * @param productId
   * @param storeId
   * @returns
   */
  @Post('sync-product/:productId/:storeId')
  async productSync(@Param('productId') productId: number, @Param('storeId') storeId: number) {
    const store = await this.storeRepo.storeModel.findByPk(storeId);
    if (!store)
      throw new BadRequestException({
        message: 'Store not found',
        success: false,
      });

    const product = await this.productrepo.productListModel.findOne({
      where: { product_id: productId },
      include: [
        { model: this.productrepo.variantModel, as: 'variants' },
        { model: this.productrepo.inventoryModel, as: 'inventories' },
      ],
    });

    if (!product)
      throw new BadRequestException({
        message: 'Product not found',
        success: false,
      });

    const inventories = (product as any).inventories;
    const variants = (product as any).variants;

    if (!inventories?.length) {
      throw new BadRequestException({
        message: 'Inventory not found',
        success: false,
      });
    }

    // same as Express buildShopifyPayload
    const payload = buildShopifyPayload(inventories[1], variants, store, {});

    // ✅ EXPRESS-EQUIVALENT LINE
    const shopifyService = this.shopifyFactory.createService(store);

    const shopifyResponse = await shopifyService.syncProduct(payload);

    if (shopifyResponse?.product?.id) {
      const inventoryIds = inventories.map((inv: any) => inv.id);
      await this.productrepo.inventoryModel.update(
        { shopifyId: shopifyResponse.product.id },
        { where: { id: inventoryIds } },
      );
    }

    return { success: true, data: shopifyResponse };
  }

  /**
   * @description find and delete item from shopify
   * @param storeId
   * @param body
   * @returns
   */
  @Post('sold-item/:storeId')
  async soldItem(@Param('storeId') storeId: number, @Body() body: { itemIds: number[] }) {
    const { itemIds } = body;
    if (!Array.isArray(itemIds) || itemIds.length === 0) {
      throw new BadRequestException({
        message: 'itemIds array is required.',
        success: false,
      });
    }

    const store = await this.storeRepo.storeModel.findByPk(storeId);
    if (!store)
      throw new BadRequestException({
        message: 'Store not found.',
        success: false,
      });

    const inventoryItems = await this.productrepo.inventoryModel.findAll({
      where: { id: itemIds, storeId },
    });

    if (!inventoryItems.length) {
      throw new BadRequestException({
        message: 'No matching inventory items found.',
        success: false,
      });
    }

    const shopifyProductIds = inventoryItems.map((item: any) => item.shopifyId).filter(Boolean);

    if (!shopifyProductIds.length) {
      throw new BadRequestException({
        message: 'No items have valid Shopify IDs to delete.',
        success: false,
      });
    }

    // ✅ EXPRESS-EQUIVALENT LINE
    const shopifyService = this.shopifyFactory.createService(store);

    const deletionResults = await shopifyService.deleteItems(shopifyProductIds);

    return {
      success: true,
      message: 'Shopify items deleted successfully.',
      data: deletionResults,
    };
  }

  @Get('get-channels')
  @UseGuards(AuthGuard)
  async getChannels(@GetUser() user: getUser) {
    const storeId = user?.storeId;
    if (!storeId) {
      throw new BadRequestException({ success: false, message: 'storeId is required.' });
    }

    const store = await this.storeRepo.storeModel.findByPk(storeId);
    if (!store) {
      throw new BadRequestException({ success: false, message: AllMessages.STORE_NF || 'Store not found.' });
    }

    if (!store.shopify_store || !store.shopify_token) {
      throw new BadRequestException({
        success: false,
        message: 'Shopify credentials are not configured for this store.',
      });
    }

    const SHOPIFY_CHANNELS_QUERY = `
      query shopifySalesChannels {
        publications(first: 30) {
          nodes {
            id
            name
            catalog {
              title
            }
          }
        }
      }
    `;

    const data: any = await shopifyGraphqlRequest(store, SHOPIFY_CHANNELS_QUERY, {});

    const channels = (data?.publications?.nodes || [])
      .map((node: any) => {
        const name = node?.name || node?.catalog?.title || '';
        return {
          publicationId: node?.id || null,
          id: node?.id || null,
          name,
          channelName: name,
          displayName: name,
          isShopifyChannel: true,
        };
      })
      .filter(
        (channel: any) =>
          channel.name &&
          (store.is_used_only_products_store || channel.name.toLowerCase() !== 'point of sale'),
      );

    return {
      success: true,
      message: 'Shopify channels fetched successfully.',
      data: channels,
    };
  }
}
