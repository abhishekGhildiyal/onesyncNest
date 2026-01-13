import {
  Body,
  Controller,
  Get,
  Param,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { GetUser } from 'src/common/decorators/get-user.decorator';

import { ApiTags } from '@nestjs/swagger';
import { AuthGuard } from 'src/common/guards/auth.guard';
import type { getUser } from 'src/common/interfaces/common/getUser';
import { ProductsService } from './products.service';

@ApiTags('ProductBrands')
@Controller('product')
@UseGuards(AuthGuard)
export class ProductsController {
  constructor(private readonly productsService: ProductsService) {}

  @Get('brands')
  allBrands(@GetUser() user: getUser, @Query() query: any) {
    return this.productsService.allBrands(user, query);
  }

  @Post('brandUpdate')
  brandUpdate(@Body() body: any) {
    return this.productsService.toggleType(body);
  }

  @Post('brandProducts')
  brandProducts(@GetUser() user: any = { storeId: 1 }, @Body() body: any) {
    return this.productsService.brandProducts(user, body);
  }

  @Post('createPackage')
  createPackage(
    @GetUser() user: any = { storeId: 1, userId: 1 },
    @Body() body: any,
  ) {
    return this.productsService.createPackage(user, body);
  }

  @Get('customers')
  allCustomers(@GetUser() user: any = { storeId: 1 }, @Query() query: any) {
    return this.productsService.AllCustomers(user, query);
  }

  @Post('linkCustomer')
  linkCustomer(@GetUser() user: any = { storeId: 1 }, @Body() body: any) {
    return this.productsService.linkCustomer(user, body);
  }

  @Post('updatePackage')
  updatePackage(@Body() body: any) {
    return this.productsService.updatePackage(body);
  }

  @Get('package/customers/:packageId')
  getPackageCustomers(@Param('packageId') packageId: number) {
    return this.productsService.getPackageCustomers(packageId);
  }

  @Post('revokeAccess')
  revokeAccess(@Body() body: any) {
    return this.productsService.revokeAccess(body);
  }
}
