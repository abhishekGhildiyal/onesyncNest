import { Body, Controller, Get, HttpCode, Param, Post, Query, Req, UseGuards } from '@nestjs/common';
import type { Request } from 'express';
import { GetUser } from 'src/common/decorators/get-user.decorator';

import { ApiTags } from '@nestjs/swagger';
import { PERMISSIONS } from 'src/common/constants/permissions';
import { RequiredPermissions } from 'src/common/decorators/permission.decorator';
import { AuthGuard } from 'src/common/guards/auth.guard';
import { PermissionGuard } from 'src/common/guards/permission.guard';
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
  getAccessPackageBrandProducts(@Req() req: Request, @Body() body: DTO.BrandProductsDto) {
    return this.productsService.getAccessPackageBrandProducts(req, body);
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

  @UseGuards(PermissionGuard)
  @RequiredPermissions(PERMISSIONS.AccessOrder)
  @Post('createPackage')
  @HttpCode(201)
  createPackage(@GetUser() user: getUser, @Body() body: any) {
    return this.productsService.createPackage(user, body);
  }

  @UseGuards(PermissionGuard)
  @RequiredPermissions(PERMISSIONS.AccessOrder)
  @Post('linkCustomer')
  linkCustomer(@GetUser() user: getUser, @Body() body: any) {
    return this.productsService.linkCustomer(user, body);
  }

  @UseGuards(PermissionGuard)
  @RequiredPermissions(PERMISSIONS.AccessOrder)
  @Post('updatePackage')
  updatePackage(@Body() body: any) {
    return this.productsService.updatePackage(body);
  }

  @UseGuards(PermissionGuard)
  @RequiredPermissions(PERMISSIONS.AccessOrder)
  @Get('package/customers/:packageId')
  getPackageCustomers(@Param('packageId') packageId: number) {
    return this.productsService.getPackageCustomers(packageId);
  }

  @UseGuards(PermissionGuard)
  @RequiredPermissions(PERMISSIONS.AccessOrder)
  @Post('revokeAccess')
  revokeAccess(@Body() body: any) {
    return this.productsService.revokeAccess(body);
  }
}
