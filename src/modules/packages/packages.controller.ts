import { Controller, Get, Post, Body, Param, Query, UseGuards, Delete } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { PackagesService } from './packages.service';
import { AuthGuard } from '../../common/guards/auth.guard';
import { AgentGuard, AgentType } from '../../common/guards/agent.guard';
import { PermissionGuard } from '../../common/guards/permission.guard';
import {
  MakePaymentDto,
  RemovePaymentDto,
  MakeShipmentDto,
  CloseOrderDto,
  MarkAllDto,
  ShortageQuantityDto,
  PackageSlipDto,
  CustomInvoiceDto,
} from './dto/packages.dto';
import { RequiredPermissions } from 'src/common/decorators/permission.decorator';
import { GetUser } from 'src/common/decorators/get-user.decorator';
import type { getUser } from 'src/common/interfaces/common/getUser';


@ApiTags('Packages')
@Controller('package')
@UseGuards(AuthGuard, AgentGuard, PermissionGuard)
export class PackagesController {
  constructor(private readonly packagesService: PackagesService) {}

  @Post('payment')
  @AgentType('is_logistic_agent', true)
  @RequiredPermissions('Ready to Process', 'Completed Orders')
  makePayment(@GetUser() user: getUser, @Body() body: MakePaymentDto) {
    return this.packagesService.makePayment(user, body);
  }

  @Get('paymentDetail/:orderId')
  @AgentType('is_logistic_agent', true)
  @RequiredPermissions('Ready to Process', 'Completed Orders')
  paymentDetail(@Param('orderId') orderId: number) {
    return this.packagesService.paymentDetail(orderId);
  }

  @Post('removePayment')
  @RequiredPermissions('Ready to Process', 'Completed Orders')
  removePayment(@Body() body: RemovePaymentDto) {
    return this.packagesService.removePayment(body);
  }

  @Post('shipment')
  @AgentType('is_logistic_agent')
  @RequiredPermissions('Ready to Process')
  makeShipment(@GetUser() user: any, @Body() body: MakeShipmentDto) {
    return this.packagesService.makeShipment(user, body);
  }

  @Get('shipmentDetail/:orderId')
  @AgentType('is_logistic_agent')
  @RequiredPermissions('Ready to Process')
  shipmentDetail(@Param('orderId') orderId: number) {
    return this.packagesService.shipmentDetail(orderId);
  }

  @Post('closeOrder/:orderId')
  @AgentType('is_logistic_agent')
  @RequiredPermissions('Ready to Process')
  closeOrder(@GetUser() user: any, @Param('orderId') orderId: number, @Body() body: CloseOrderDto) {
    return this.packagesService.closeOrder(user, orderId, body);
  }

  @Get('itemReceived/:itemId')
  itemReceived(@Param('itemId') itemId: number) {
    return this.packagesService.itemReceived(itemId);
  }

  @Get('invoiceList')
  invoiceList(@GetUser() user: any, @Query() query: any) {
    return this.packagesService.invoiceList(user, query);
  }

  @Get('customInvoice/:invoiceId')
  invoiceDetail(@Param('invoiceId') invoiceId: number) {
    return this.packagesService.invoiceDetail(invoiceId);
  }

  @Post('invoice/savepdf')
  savepdf(@Body() body: any) {
    return this.packagesService.savepdf(body);
  }

  @Post('markAll')
  markAll(@Body() body: MarkAllDto) {
    return this.packagesService.markAll(body);
  }

  @Post('shortageQuantity')
  shortageQuantities(@Body() body: ShortageQuantityDto) {
    return this.packagesService.shortageQuantities(body);
  }

  @Get('check-admin-store')
  checkAdminStore(@GetUser() user: any) {
    return this.packagesService.checkAdminStore(user);
  }

  @Post('completePkg/:orderId')
  completePkg(@GetUser() user: any, @Param('orderId') orderId: number, @Body() body: CloseOrderDto) {
    return this.packagesService.completePkg(user, orderId, body);
  }

  @Post('packageSlip')
  packageSlip(@GetUser() user: any, @Body() body: PackageSlipDto) {
    return this.packagesService.packageSlip(user, body);
  }

  @Post('customInvoice')
  customInvoice(@GetUser() user: any, @Body() body: CustomInvoiceDto) {
    return this.packagesService.customInvoice(user, body);
  }
}
