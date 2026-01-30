import { Body, Controller, Get, Post, UseGuards } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { GetUser } from 'src/common/decorators/get-user.decorator';
import { AuthGuard } from 'src/common/guards/auth.guard';
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

  // Consumer inventory
  @Post('getAll')
  getAllInventory(@GetUser() user: getUser, @Body() body: DTO.GetAllInventoryDto) {
    return this.inventoryService.getAllInventory(user, body);
  }

  @Post('products')
  consumerProducts(@GetUser() user: getUser, @Body() body: DTO.ConsumerProductsDto) {
    return this.inventoryService.consumerProducts(user, body);
  }

  @Post('detail')
  productVariants(@GetUser() user: getUser, @Body() body: DTO.ProductVariantsDto) {
    return this.inventoryService.productVariants(body);
  }

  @Get('inventoryBrands')
  inventoryBrands(@GetUser() user: getUser) {
    return this.inventoryService.inventoryBrands(user);
  }
}
