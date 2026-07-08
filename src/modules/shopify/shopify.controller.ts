import { BadRequestException, Body, Controller, Get, NotFoundException, Param, Post, UseGuards } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { GetUser } from 'src/common/decorators/get-user.decorator';
import { AuthGuard } from 'src/common/guards/auth.guard';
import type { getUser } from 'src/common/interfaces/common/getUser';
import { AllMessages } from 'src/common/constants/messages';
import { PersistShopifyVariantIdsHelper } from 'src/common/helpers/shopify/persist-shopify-variant-ids.helper';
import { User } from 'src/db/entities';
import { ProductRepository } from 'src/db/repository/product.repository';
import { StoreRepository } from 'src/db/repository/store.repository';
import { buildShopifyPayload, resolveIsWebSync } from './shopify.helper';
import { COST_TIER, shopifyGraphqlRequest } from './shopify-graphql.client';
import { ShopifyServiceFactory } from './shopify.service';

@ApiTags('Shopify')
@Controller('shopify')
export class ShopifyController {
  constructor(
    private readonly storeRepo: StoreRepository,
    private readonly productrepo: ProductRepository,
    private readonly shopifyFactory: ShopifyServiceFactory,
    private readonly persistVariantIds: PersistShopifyVariantIdsHelper,
  ) {}

  /**
   * @description Sync product to shopify
   */
  @Post('sync-product/:productId/:storeId')
  async productSync(@Param('productId') productId: number, @Param('storeId') storeId: number) {
    console.log('🔹 productSync called with:', { productId, storeId });

    try {
      const store = await this.storeRepo.storeModel.findByPk(storeId);
      if (!store) {
        console.warn(`❌ Store not found: ID=${storeId}`);
        throw new NotFoundException({ error: 'Store not found' });
      }

      console.log('✅ Store found:', {
        id: store.store_id,
        name: store.store_name,
        domain: store.shopify_store,
      });

      const product = await this.productrepo.productListModel.findOne({
        where: { product_id: productId },
        include: [
          { model: this.productrepo.variantModel, as: 'variants' },
          {
            model: this.productrepo.inventoryModel,
            as: 'inventories',
            include: [{ model: User, as: 'user' }],
          },
        ],
      });

      if (!product) {
        console.warn(`❌ Product not found: ID=${productId}`);
        throw new NotFoundException({ error: 'Product not found' });
      }

      const inventories = (product as any).inventories;
      const variants = (product as any).variants;

      if (!inventories) {
        console.warn(`❌ Inventory missing for product: ID=${productId}`);
        throw new NotFoundException({ error: 'Inventory not found' });
      }

      const template = {};
      const payload = buildShopifyPayload(inventories[1], variants, store, template);
      console.log('📦 Shopify Payload ready');

      const shopifyService = this.shopifyFactory.createService(store, { useGraphql: true });
      const shopifyResponse = await shopifyService.syncProduct(payload);

      console.log('🔹 Shopify Response received');

      if (shopifyResponse?.product?.id && inventories?.length) {
        const inventoryIds = inventories.map((inv: any) => inv.id);
        const syncedInventory = inventories[1] || inventories[0];

        await this.productrepo.inventoryModel.update(
          { shopifyId: shopifyResponse.product.id },
          { where: { id: inventoryIds } },
        );

        await this.persistVariantIds.persistShopifyVariantIds({
          shopifyResult: shopifyResponse,
          localVariants: variants,
          isWeb: resolveIsWebSync(syncedInventory, store),
        });

        console.log(
          `✅ Updated ${inventoryIds.length} inventories with Shopify ID: ${shopifyResponse.product.id}`,
        );
      }

      return { success: true, data: shopifyResponse };
    } catch (err) {
      console.error('❌ productSync error:', err);
      if (err instanceof BadRequestException) throw err;
      throw new BadRequestException({ error: (err as Error).message });
    }
  }

  /**
   * @description find and delete item from shopify
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

    const shopifyService = this.shopifyFactory.createService(store, { useGraphql: true });
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

    const data: any = await shopifyGraphqlRequest(store, SHOPIFY_CHANNELS_QUERY, {}, {
      estimatedCost: COST_TIER.MEDIUM,
    });

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
