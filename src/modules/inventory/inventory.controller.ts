import { Body, Controller, Get, HttpCode, Param, ParseIntPipe, Patch, Post, UseGuards } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { GetUser } from 'src/common/decorators/get-user.decorator';
import { AuthGuard } from 'src/common/guards/auth.guard';
import { ConsumerGuard } from 'src/common/guards/consumer.guard';
import type { getUser } from 'src/common/interfaces/common/getUser';
import * as DTO from './dto/inventory.dto';
import { InventoryService } from './inventory.service';

@ApiTags('Inventory')
@Controller('inventory')
@UseGuards(AuthGuard)
export class InventoryController {
  constructor(private readonly inventoryService: InventoryService) {}

  @Post('hyperAdd')
  hyperAddinventory(@Body() body: DTO.HyperAddInventoryDto) {
    return this.inventoryService.hyperAddinventory(body);
  }

  @Post('syncConsumerOrderItems')
  syncConsumerOrderItems(@GetUser() user: getUser, @Body() body: DTO.SyncConsumerOrderItemsDto) {
    return this.inventoryService.syncPackagesAfterStockReduction(user, body);
  }

  @Post(':storeDomain/syncWebInventories')
  syncWebInventories(@Param('storeDomain') storeDomain: string, @Body() productIds: number[]) {
    return this.inventoryService.syncWebInventories(storeDomain, productIds);
  }

  @Post('syncFullInventory')
  syncFullInventory(@GetUser() user: getUser, @Body() body: DTO.SyncFullInventoryDto) {
    return this.inventoryService.syncFullInventory(user, body);
  }

  @Post('addInventory')
  @HttpCode(201)
  addInventory(@GetUser() user: getUser, @Body() body: any) {
    return this.inventoryService.addInventory(user, body);
  }

  @Patch('bulkUpdate')
  bulkUpdateInventory(@GetUser() user: getUser, @Body() body: DTO.BulkUpdateInventoryDto) {
    return this.inventoryService.bulkUpdateInventory(user, body);
  }

  @Patch(':itemId')
  updateItemById(
    @GetUser() user: getUser,
    @Param('itemId', ParseIntPipe) itemId: number,
    @Body() body: Record<string, any>,
  ) {
    return this.inventoryService.updateItemById(user, itemId, body);
  }

  // Consumer inventory
  @Post('getAll')
  @UseGuards(ConsumerGuard)
  getAllInventory(@GetUser() user: getUser, @Body() body: DTO.GetAllInventoryDto) {
    return this.inventoryService.getAllInventory(user, body);
  }

  @Post('products')
  @UseGuards(ConsumerGuard)
  consumerProducts(@GetUser() user: getUser, @Body() body: DTO.ConsumerProductsDto) {
    return this.inventoryService.consumerProducts(user, body);
  }

  @Post('detail')
  @UseGuards(ConsumerGuard)
  productVariants(@GetUser() user: getUser, @Body() body: DTO.ProductVariantsDto) {
    return this.inventoryService.productVariants(body);
  }

  @Get('inventoryBrands')
  @UseGuards(ConsumerGuard)
  inventoryBrands(@GetUser() user: getUser) {
    return this.inventoryService.inventoryBrands(user);
  }

  @Post('addInventory-CtoS')
  @UseGuards(ConsumerGuard)
  addInventoryCtoS(@GetUser() user: getUser, @Body() body: DTO.AddInventoryCtoSDto) {
    return this.inventoryService.addInventoryCtoS(user, body);
  }
}
