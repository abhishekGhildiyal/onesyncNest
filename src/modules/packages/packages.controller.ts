import { Body, Controller, Get, Param, Post, Query, UseGuards } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { PERMISSIONS } from 'src/common/constants/permissions';
import { AgentType } from 'src/common/decorators/agent-type.decorator';
import { GetUser } from 'src/common/decorators/get-user.decorator';
import { RequiredPermissions } from 'src/common/decorators/permission.decorator';
import type { getUser } from 'src/common/interfaces/common/getUser';
import { AgentGuard } from '../../common/guards/agent.guard';
import { AuthGuard } from '../../common/guards/auth.guard';
import { PermissionGuard } from '../../common/guards/permission.guard';
import {
  CompletePkgDto,
  CustomInvoiceDto,
  InvoiceIdParamDto,
  InvoiceListQueryDto,
  ItemIdParamDto,
  MakePaymentDto,
  MakeShipmentDto,
  MarkAllDto,
  OrderIdParamDto,
  PackageSlipDto,
  RemovePaymentDto,
  SavePdfDto,
  ShortageQuantityDto,
} from './dto/packages.dto';
import { PackagesService } from './packages.service';

@ApiTags('Packages')
@Controller('package')
export class PackagesController {
  constructor(private readonly packagesService: PackagesService) {}

  @Post('payment')
  @UseGuards(AuthGuard, AgentGuard, PermissionGuard)
  @AgentType('is_logistic_agent', true)
  @RequiredPermissions(PERMISSIONS.ReadyToProccess.name, PERMISSIONS.Completed.name)
  makePayment(@GetUser() user: getUser, @Body() body: MakePaymentDto) {
    return this.packagesService.makePayment(user, body);
  }

  @Get('paymentDetail/:orderId')
  @UseGuards(AuthGuard, AgentGuard, PermissionGuard)
  @AgentType('is_logistic_agent', true)
  @RequiredPermissions(PERMISSIONS.ReadyToProccess.name, PERMISSIONS.Completed.name)
  paymentDetail(@Param() params: OrderIdParamDto) {
    return this.packagesService.paymentDetail(params.orderId);
  }

  @Post('removePayment')
  @UseGuards(AuthGuard, PermissionGuard)
  @RequiredPermissions(PERMISSIONS.ReadyToProccess.name, PERMISSIONS.Completed.name)
  removePayment(@Body() body: RemovePaymentDto) {
    return this.packagesService.removePayment(body);
  }

  @Post('shipment')
  @UseGuards(AuthGuard, AgentGuard, PermissionGuard)
  @AgentType('is_logistic_agent')
  @RequiredPermissions(PERMISSIONS.ReadyToProccess.name)
  makeShipment(@GetUser() user: getUser, @Body() body: MakeShipmentDto) {
    return this.packagesService.makeShipment(user, body);
  }

  @Get('shipmentDetail/:orderId')
  @UseGuards(AuthGuard, AgentGuard, PermissionGuard)
  @AgentType('is_logistic_agent')
  @RequiredPermissions(PERMISSIONS.ReadyToProccess.name)
  shipmentDetail(@Param() params: OrderIdParamDto) {
    return this.packagesService.shipmentDetail(params.orderId);
  }

  @Post('closeOrder/:orderId')
  @UseGuards(AuthGuard, AgentGuard, PermissionGuard)
  @AgentType('is_logistic_agent')
  @RequiredPermissions(PERMISSIONS.ReadyToProccess.name)
  closeOrder(@GetUser() user: getUser, @Param() params: OrderIdParamDto, @Body() body: any) {
    return this.packagesService.closeOrder(user, params, body);
  }

  @Post('packageSlip')
  @UseGuards(AuthGuard)
  packageSlip(@GetUser() user: getUser, @Body() body: PackageSlipDto) {
    return this.packagesService.packageSlip(user, body);
  }

  @Post('customInvoice')
  @UseGuards(AuthGuard)
  customInvoice(@GetUser() user: getUser, @Body() body: CustomInvoiceDto) {
    return this.packagesService.customInvoice(user, body);
  }

  @Get('invoiceList')
  @UseGuards(AuthGuard)
  invoiceList(@GetUser() user: getUser, @Query() query: InvoiceListQueryDto) {
    return this.packagesService.invoiceList(user, query);
  }

  @Get('customInvoice/:invoiceId')
  @UseGuards(AuthGuard)
  invoiceDetail(@Param() params: InvoiceIdParamDto) {
    return this.packagesService.invoiceDetail(params.invoiceId);
  }

  @Post('invoice/savepdf')
  @UseGuards(AuthGuard)
  savepdf(@Body() body: SavePdfDto) {
    return this.packagesService.savepdf(body);
  }

  @Get('itemReceived/:itemId')
  @UseGuards(AuthGuard)
  itemReceived(@Param() params: ItemIdParamDto) {
    return this.packagesService.itemReceived(params.itemId);
  }

  @Post('markAll')
  @UseGuards(AuthGuard)
  markAll(@Body() body: MarkAllDto) {
    return this.packagesService.markAll(body);
  }

  @Post('shortageQuantity')
  @UseGuards(AuthGuard)
  shortageQuantities(@Body() body: ShortageQuantityDto) {
    return this.packagesService.shortageQuantities(body);
  }

  @Get('check-admin-store')
  @UseGuards(AuthGuard)
  checkAdminStore(@GetUser() user: getUser) {
    return this.packagesService.checkAdminStore(user);
  }

  @Post('completePkg/:orderId')
  @UseGuards(AuthGuard)
  completePkg(@GetUser() user: getUser, @Param() params: OrderIdParamDto, @Body() body: CompletePkgDto) {
    return this.packagesService.completePkg(user, params.orderId, body);
  }
}
