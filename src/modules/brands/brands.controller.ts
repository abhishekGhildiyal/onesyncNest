import { Controller, Get, Post, Body, Param, Query, UseGuards } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { BrandsService } from './brands.service';
import { BrandProductsDto, BrandUpdateDto, CreatePackageDto, LinkCustomerDto, UpdatePackageDto, RevokeAccessDto } from './dto/brands.dto';
import { AuthGuard } from '../../common/guards/auth.guard';
import { AgentGuard } from '../../common/guards/agent.guard';
import { PermissionGuard } from '../../common/guards/permission.guard';
import { PERMISSIONS } from '../../common/constants/permissions';
import { GetUser } from 'src/common/decorators/get-user.decorator';
import { RequiredPermissions } from 'src/common/decorators/permission.decorator';

@ApiTags('Brands')
@Controller('brands')
@UseGuards(AuthGuard)
export class BrandsController {
  constructor(private readonly brandsService: BrandsService) {}

  /**
   * @description Fetch all brands with products
   */
  @Get()
  async allBrands(@GetUser() user: any, @Query() query: any) {
    return this.brandsService.allBrands(user, query);
  }

  /**
   * @description Toggle brand type (Public/Private)
   */
  @Post('update')
  async toggleType(@Body() body: BrandUpdateDto) {
    return this.brandsService.toggleType(body);
  }

  /**
   * @description Get products by brand for packages
   */
  @Post('products')
  async brandProducts(@GetUser() user: any, @Body() body: BrandProductsDto) {
    return this.brandsService.brandProducts(user, body);
  }

  /**
   * @description Get brand products for access list
   */
  @Post('products/access-list')
  async brandProductsAccessList(@GetUser() user: any, @Body() body: BrandProductsDto) {
    return this.brandsService.brandProductsAcessList(user, body);
  }

  /**
   * @description Get consumer accessible brand products
   */
  @Post('consumer/products')
  async getAccessPackageBrandProducts(@GetUser() user: any, @Body() body: any) {
    return this.brandsService.getAccessPackageBrandProducts(user, body);
  }

  /**
   * @description Get all customers
   */
  @Get('customers')
  async allCustomers(@GetUser() user: any, @Query() query: any) {
    return this.brandsService.allCustomers(user, query);
  }

  /**
   * @description Create new package
   */
  @Post('package')
  @UseGuards(PermissionGuard)
  @RequiredPermissions(PERMISSIONS.AccessOrder.name)
  async createPackage(@GetUser() user: any, @Body() body: CreatePackageDto) {
    return this.brandsService.createPackage(user, body);
  }

  /**
   * @description Link customer to package
   */
  @Post('package/link-customer')
  @UseGuards(PermissionGuard)
  @RequiredPermissions(PERMISSIONS.AccessOrder.name)
  async linkCustomer(@GetUser() user: any, @Body() body: LinkCustomerDto) {
    return this.brandsService.linkCustomer(user, body);
  }

  /**
   * @description Update package details
   */
  @Post('package/update')
  @UseGuards(PermissionGuard)
  @RequiredPermissions(PERMISSIONS.AccessOrder.name)
  async updatePackage(@GetUser() user: any, @Body() body: UpdatePackageDto) {
    return this.brandsService.updatePackage(user, body);
  }

  /**
   * @description Get package customers
   */
  @Get('package/:packageId/customers')
  @UseGuards(PermissionGuard)
  @RequiredPermissions(PERMISSIONS.AccessOrder.name)
  async getPackageCustomers(@Param('packageId') packageId: number) {
    return this.brandsService.getPackageCustomers(packageId);
  }

  /**
   * @description Revoke customer access
   */
  @Post('package/revoke-access')
  @UseGuards(PermissionGuard)
  @RequiredPermissions(PERMISSIONS.AccessOrder.name)
  async revokeAccess(@Body() body: RevokeAccessDto) {
    return this.brandsService.revokeAccess(body);
  }
}
