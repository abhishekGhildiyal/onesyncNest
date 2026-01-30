import { Body, Controller, Get, Param, Post, Query, UseGuards } from '@nestjs/common';
import { GetUser } from 'src/common/decorators/get-user.decorator';

import { ApiTags } from '@nestjs/swagger';
import { AuthGuard } from 'src/common/guards/auth.guard';
import type { getUser } from 'src/common/interfaces/common/getUser';
import * as DTO from './dto/product.dto';
import { ProductsService } from './products.service';

@ApiTags('ProductBrands')
@Controller('product')
@UseGuards(AuthGuard)
export class ProductsController {
  constructor(private readonly productsService: ProductsService) {}

  @Post('brandProducts')
  brandProducts(@GetUser() user: getUser, @Body() body: any) {
    return this.productsService.brandProducts(user, body);
  }

  @Post('brandProductsAccessList')
  brandProductsAccessList(@GetUser() user: getUser, @Body() body: DTO.BrandProductsDto) {
    return this.productsService.brandProductsAcessList(user, body);
  }

  @Post('consumerBrandProducts')
  getAccessPackageBrandProducts(@Param() params: DTO.OrderIdParamDto, @Body() body: DTO.BrandProductsDto) {
    return this.productsService.getAccessPackageBrandProducts(params, body);
  }

  //   -------------------------------------
  @Get('brands')
  allBrands(@GetUser() user: getUser, @Query() query: any) {
    return this.productsService.allBrands(user, query);
  }

  @Post('brandUpdate')
  brandUpdate(@Body() body: any) {
    return this.productsService.toggleType(body);
  }

  @Get('customers')
  allCustomers(@GetUser() user: getUser, @Query() query: DTO.AllCustomersDto) {
    return this.productsService.AllCustomers(user, query);
  }

  @Post('createPackage')
  createPackage(@GetUser() user: getUser, @Body() body: any) {
    return this.productsService.createPackage(user, body);
  }

  @Post('linkCustomer')
  linkCustomer(@GetUser() user: getUser, @Body() body: any) {
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
