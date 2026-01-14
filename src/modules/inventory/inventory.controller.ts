import { Body, Controller, Get, Post } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { GetUser } from 'src/common/decorators/get-user.decorator';
import type { getUser } from 'src/common/interfaces/common/getUser';
import { InventoryService } from './inventory.service';

@ApiTags('Inventory')
@Controller('inventory')
export class InventoryController {
  constructor(private readonly inventoryService: InventoryService) {}

  @Post('all')
  getAllInventory(@GetUser() user: getUser, @Body() body: any) {
    return this.inventoryService.getAllInventory(user, body);
  }

  @Post('consumer-products')
  consumerProducts(@GetUser() user: getUser, @Body() body: any) {
    return this.inventoryService.consumerProducts(user, body);
  }

  @Post('variants')
  productVariants(@Body() body: any) {
    return this.inventoryService.productVariants(body);
  }

  @Get('brands')
  inventoryBrands(@GetUser() user: getUser) {
    return this.inventoryService.inventoryBrands(user);
  }

  @Post('hyper-add')
  hyperAddinventory(@Body() body: any) {
    return this.inventoryService.hyperAddinventory(body);
  }
}
