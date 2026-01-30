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
import * as DTO from './dto/packages.dto';
import {
  CloseOrderDto,
  CustomInvoiceDto,
  MakePaymentDto,
  MakeShipmentDto,
  MarkAllDto,
  PackageSlipDto,
  RemovePaymentDto,
  ShortageQuantityDto,
} from './dto/packages.dto';
import { PackagesService } from './packages.service';

@ApiTags('Packages')
@Controller('package')
@UseGuards(AuthGuard, AgentGuard, PermissionGuard)
export class PackagesController {
  constructor(private readonly packagesService: PackagesService) {}

  @Post('payment')
  @AgentType('is_logistic_agent', true)
  @RequiredPermissions(PERMISSIONS.ReadyToProccess.name, PERMISSIONS.Completed.name)
  makePayment(@GetUser() user: getUser, @Body() body: MakePaymentDto) {
    return this.packagesService.makePayment(user, body);
  }

  @Get('paymentDetail/:orderId')
  @AgentType('is_logistic_agent', true)
  @RequiredPermissions(PERMISSIONS.ReadyToProccess.name, PERMISSIONS.Completed.name)
  paymentDetail(@Param('orderId') orderId: number) {
    return this.packagesService.paymentDetail(orderId);
  }

  @Post('removePayment')
  @RequiredPermissions(PERMISSIONS.ReadyToProccess.name, PERMISSIONS.Completed.name)
  removePayment(@Body() body: RemovePaymentDto) {
    return this.packagesService.removePayment(body);
  }

  @Post('shipment')
  @AgentType('is_logistic_agent')
  @RequiredPermissions(PERMISSIONS.ReadyToProccess.name)
  makeShipment(@GetUser() user: any, @Body() body: MakeShipmentDto) {
    return this.packagesService.makeShipment(user, body);
  }

  @Get('shipmentDetail/:orderId')
  @AgentType('is_logistic_agent')
  @RequiredPermissions(PERMISSIONS.ReadyToProccess.name)
  shipmentDetail(@Param('orderId') orderId: number) {
    return this.packagesService.shipmentDetail(orderId);
  }

  @Post('closeOrder/:orderId')
  @AgentType('is_logistic_agent')
  @RequiredPermissions(PERMISSIONS.ReadyToProccess.name)
  closeOrder(@GetUser() user: any, @Param() params: DTO.OrderIdParamDto, @Body() body: CloseOrderDto) {
    return this.packagesService.closeOrder(user, params, body);
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
