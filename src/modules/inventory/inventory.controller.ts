import { Controller, Post, Body, Get, UseGuards } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { InventoryService } from './inventory.service';
import { AuthGuard } from '../../common/guards/auth.guard';

@ApiTags('Inventory')
@Controller('inventory')
export class InventoryController {
  constructor(private readonly inventoryService: InventoryService) {}

  @Post('all')
  getAllInventory(@Body() body: any) {
    const user = { userId: 1 }; // Placeholder
    return this.inventoryService.getAllInventory(user, body);
  }

  @Post('consumer-products')
  consumerProducts(@Body() body: any) {
    const user = { userId: 1 }; // Placeholder
    return this.inventoryService.consumerProducts(user, body);
  }

  @Post('variants')
  productVariants(@Body() body: any) {
    return this.inventoryService.productVariants(body);
  }

  @Get('brands')
  inventoryBrands() {
    const user = { userId: 1 }; // Placeholder
    return this.inventoryService.inventoryBrands(user);
  }

  @Post('hyper-add')
  hyperAddinventory(@Body() body: any) {
    return this.inventoryService.hyperAddinventory(body);
  }
}
