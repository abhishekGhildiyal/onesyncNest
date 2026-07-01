import { Body, Controller, Get, HttpCode, Param, ParseIntPipe, Post, Query, UseGuards } from '@nestjs/common';
import { GetUser } from 'src/common/decorators/get-user.decorator';

import { ApiTags } from '@nestjs/swagger';
import { PERMISSIONS } from 'src/common/constants/permissions';
import { AgentType } from 'src/common/decorators/agent-type.decorator';
import { RequiredPermissions } from 'src/common/decorators/permission.decorator';
import { AgentGuard } from 'src/common/guards/agent.guard';
import { AuthGuard } from 'src/common/guards/auth.guard';
import { ConsumerGuard } from 'src/common/guards/consumer.guard';
import { PermissionGuard } from 'src/common/guards/permission.guard';
import type { getUser } from 'src/common/interfaces/common/getUser';
import * as DTO from './dto/orders.dto';
import { OrdersService } from './orders.service';

const allTabsPermission = [
  PERMISSIONS.ConsumerOrders,
  PERMISSIONS.OpenRequest,
  PERMISSIONS.AccessOrder,
  PERMISSIONS.InReview,
  PERMISSIONS.Completed,
  PERMISSIONS.ReadyToProccess,
];
@ApiTags('Orders')
@Controller('order')
@UseGuards(AuthGuard)
export class OrdersController {
  constructor(private readonly ordersService: OrdersService) {}

  /**
   |--------------------------------------------------
   | # Store Admin Routes
   |--------------------------------------------------
   */
  @UseGuards(PermissionGuard)
  @RequiredPermissions(...allTabsPermission)
  @Post('storeOrders')
  storeOrders(@GetUser() user: getUser, @Body() body: DTO.GetOrdersDto) {
    return this.ordersService.storeOrders(user, body);
  }

  @UseGuards(AgentGuard, PermissionGuard)
  @AgentType('is_sales_agent', false)
  @RequiredPermissions(PERMISSIONS.OpenRequest)
  @Get('initiateOrder/:orderId')
  initiateOrder(@GetUser() user: getUser, @Param() param: DTO.OrderIdParamDto) {
    return this.ordersService.initiateOrder(param, user);
  }

  @UseGuards(PermissionGuard)
  @RequiredPermissions(PERMISSIONS.AccessOrder)
  @Get('allOrderItems/price/:orderId')
  getAllOrderItemsPrice(@Param() param: DTO.OrderIdParamDto) {
    return this.ordersService.getAllOrderItemsPrice(param);
  }

  @UseGuards(AgentGuard, PermissionGuard)
  @AgentType('is_sales_agent', true)
  @RequiredPermissions(...allTabsPermission)
  @Post('setItemPrice')
  setItemPrice(@GetUser() user: getUser, @Body() body: DTO.SetItemPriceDto) {
    return this.ordersService.setItemPrice(user, body);
  }

  @UseGuards(AgentGuard, PermissionGuard)
  @AgentType('is_sales_agent', false)
  @RequiredPermissions(PERMISSIONS.OpenRequest)
  @Get('markReview/:orderId')
  markReview(@Param() orderId: DTO.OrderIdParamDto, @GetUser() user: getUser) {
    return this.ordersService.markReview(orderId, user);
  }

  @Post('createManualOrder')
  @HttpCode(201)
  createManualOrder(@GetUser() user: getUser, @Body() body: DTO.CreateManualOrderDto) {
    return this.ordersService.createManualOrder(user, body);
  }

  @Get(':orderId/brands/:brandId/manualProducts')
  manualProducts(@Param() params: DTO.ParamOrderIdBrandIdDto) {
    return this.ordersService.manualProducts(params);
  }

  @Get('agentList/:type')
  agentList(@GetUser() user: getUser, @Param() params: DTO.AgentTypeParamDto) {
    return this.ordersService.agentList(user, params);
  }

  @UseGuards(AgentGuard)
  @AgentType('is_logistic_agent', true)
  @Post('startOrderProcess')
  startOrderProcess(@GetUser() user: getUser, @Body() body: DTO.StartOrderProcessDto) {
    return this.ordersService.startOrderProcess(user, body);
  }

  @UseGuards(AgentGuard)
  @AgentType('is_sales_agent', true)
  @Post('assignSalesAgent')
  assignSalesAgent(@Body() body: DTO.AssignSalesAgentDto) {
    return this.ordersService.assignSalesAgent(body);
  }

  @Post('addNotes')
  addNotes(@Body() body: DTO.AddNotesDto) {
    return this.ordersService.addNotes(body);
  }

  @Get('getNotes/:orderId')
  getNotes(@Param() param: DTO.OrderIdParamDto) {
    return this.ordersService.getNotes(param);
  }

  @Post('store-confirm/:orderId')
  storeConfirm(
    @Param() param: DTO.OrderIdParamDto,
    @GetUser() user: getUser,
    @Body() body: DTO.StoreConfirmDto,
  ) {
    return this.ordersService.storeConfirm(param, user, body);
  }

  @Get('cancel/:orderId')
  cancelOrder(@Param() param: DTO.OrderIdParamDto) {
    return this.ordersService.cancelOrder(param);
  }

  @Post('paymentNote')
  paymentNote(@Body() body: DTO.PaymentNoteDto) {
    return this.ordersService.paymentNote(body);
  }

  @Get('paymentNote/:orderId')
  getPaymentNote(@Param() param: DTO.OrderIdParamDto) {
    return this.ordersService.getPaymentNote(param);
  }

  @Get('shortage/:orderId')
  getShortage(@GetUser() user: getUser, @Param() param: DTO.OrderIdParamDto) {
    return this.ordersService.getShortage(user, param);
  }

  /**
|--------------------------------------------------
| # Common Routes
|--------------------------------------------------
*/

  @Post('getVariantCost')
  getVariantCost(@Body() body: DTO.GetVariantCostDto) {
    return this.ordersService.getVariantCost(body);
  }

  @Get(':orderId/brands/:status')
  getPackageBrands(@GetUser() user: getUser, @Param() params: DTO.OrderIdStatusParamDto, @Query() query: any) {
    return this.ordersService.getPackageBrands(user, params, query);
  }

  @Get(':orderId/brands/:brandId/products')
  getPackageBrandProducts(@Param() params: DTO.ParamOrderIdBrandIdDto, @Query() query: any) {
    return this.ordersService.getPackageBrandProducts(params, query);
  }

  @Post('itemTotalPrice')
  itemTotalPrice(@Body() body: DTO.ItemTotalPriceDto) {
    return this.ordersService.itemTotalPrice(body);
  }

  @Post('totalItemCount/:orderId')
  totalItemCount(@Param() param: DTO.OrderIdParamDto) {
    return this.ordersService.totalItemCount(param);
  }

  @Get('orders-count')
  orderCount(@GetUser() user: getUser) {
    return this.ordersService.orderCount(user);
  }

  @Post('checkStock')
  checkStock(@Body() body: DTO.CheckStockDto) {
    return this.ordersService.checkStock(body);
  }

  @Post('/syncStock')
  syncStock(@Body() body: DTO.SyncStockDto) {
    return this.ordersService.syncStock(body);
  }

  @Post('syncFullStock')
  syncFullStock(@Body() body: DTO.SyncFullStock) {
    return this.ordersService.syncFullStock(body);
  }

  @Post('syncBeforeConfirm')
  syncAndDeleteConfirm(@Body() body: DTO.SyncBeforeConfirmDto) {
    return this.ordersService.syncAndDeleteConfirm(body);
  }

  /**
  |--------------------------------------------------
  | # Consumer Routes
  |--------------------------------------------------
  */
  @UseGuards(ConsumerGuard)
  @Post('accessList')
  accessList(@GetUser() user: getUser, @Body() body: DTO.AccessListDto) {
    return this.ordersService.accessList(user, body);
  }

  @UseGuards(ConsumerGuard)
  @Post('getAll')
  allOrders(@GetUser() user: getUser, @Body() body: DTO.GetOrdersDto) {
    return this.ordersService.allOrders(user, body);
  }

  @UseGuards(ConsumerGuard)
  @Post('updateAccessBrandQty')
  updateAccessBrandQty(@Body() body: DTO.UpdateAccessVariantQuantityDto) {
    return this.ordersService.updateAccessVarientQuantity(body);
  }

  @UseGuards(ConsumerGuard)
  @Post('updateBrandQty')
  updateBrandQty(@Body() body: DTO.UpdateQuantityDto) {
    return this.ordersService.updateVarientQuantity(body);
  }

  @UseGuards(ConsumerGuard)
  @Post('setItemPriceConsumer')
  setItemPriceConsumer(@GetUser() user: getUser, @Body() body: DTO.SetItemPriceDto) {
    return this.ordersService.setItemPriceConsumer(user, body);
  }

  @UseGuards(ConsumerGuard)
  @Post('saveAsDraft')
  @HttpCode(201)
  saveOrderAsDraft(@GetUser() user: getUser, @Body() body: DTO.saveAsDraftDto) {
    return this.ordersService.saveOrderAsDraft(user, body);
  }

  @UseGuards(ConsumerGuard)
  @Get('sellingPriceFloater/:orderId')
  sellingPriceFloater(@Param() param: DTO.OrderIdParamDto) {
    return this.ordersService.sellingPriceFloater(param);
  }

  @UseGuards(ConsumerGuard)
  @Post('createOrder')
  createOrder(@GetUser() user: getUser, @Body() body: DTO.CreateOrderDto) {
    return this.ordersService.createOrder(user, body);
  }

  @UseGuards(ConsumerGuard)
  @Post('updateOrderBrands')
  updateOrderBrands(@Body() body: DTO.UpdateOrderBrandsDto) {
    return this.ordersService.updateOrderBrands(body);
  }

  @UseGuards(ConsumerGuard)
  @Post(':orderId/confirm')
  confirmOrder(
    @Param('orderId', ParseIntPipe) orderId: number,
    @GetUser() user: getUser,
    @Body() body: DTO.ConfirmOrderDto,
  ) {
    return this.ordersService.confirmOrder(orderId, user, body);
  }

  @UseGuards(ConsumerGuard)
  @Post('confirmOrder/:orderId')
  confirmOrderLegacy(
    @Param('orderId', ParseIntPipe) orderId: number,
    @GetUser() user: getUser,
    @Body() body: DTO.ConfirmOrderDto,
  ) {
    return this.ordersService.confirmOrder(orderId, user, body);
  }
}
