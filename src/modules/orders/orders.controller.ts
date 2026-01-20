import { Body, Controller, Get, Headers, Param, Post, Query, UseGuards } from '@nestjs/common';
import { GetUser } from 'src/common/decorators/get-user.decorator';

import { ApiTags } from '@nestjs/swagger';
import { PERMISSIONS } from 'src/common/constants/permissions';
import { AgentType } from 'src/common/decorators/agent-type.decorator';
import { RequiredPermissions } from 'src/common/decorators/permission.decorator';
import { AgentGuard } from 'src/common/guards/agent.guard';
import { AuthGuard } from 'src/common/guards/auth.guard';
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
  getAllOrderItemsPrice(@Param('orderId') param: DTO.OrderIdParamDto) {
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
  markReview(@Param('orderId') orderId: DTO.OrderIdParamDto, @GetUser() user: getUser) {
    return this.ordersService.markReview(orderId, user);
  }

  @Post('createManualOrder')
  createManualOrder(@GetUser() user: getUser, @Body() body: DTO.CreateManualOrderDto) {
    return this.ordersService.createManualOrder(user, body);
  }

  @Get(':orderId/brands/:brandId/manualProducts')
  manualProducts(@Param() params: DTO.ParamOrderIdBrandIdDto) {
    return this.ordersService.manualProducts(params);
  }

  @Get('agentList/:type')
  agentList(@GetUser() user: getUser, @Param('type') params: DTO.AgentTypeParamDto) {
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
  getNotes(@Param('orderId') param: DTO.OrderIdParamDto) {
    return this.ordersService.getNotes(param);
  }

  @Post('store-confirm/:orderId')
  storeConfirm(@Param('orderId') param: DTO.OrderIdParamDto, @GetUser() user: getUser, @Body() body: any) {
    return this.ordersService.storeConfirm(param, user, body);
  }

  @Post('accessList')
  accessList(@GetUser() user: getUser, @Body() body: any) {
    return this.ordersService.accessList(user, body);
  }

  @Post('getAll')
  allOrders(@GetUser() user: getUser, @Body() body: any) {
    return this.ordersService.allOrders(user, body);
  }

  @Get(':orderId/brands')
  getPackageBrands(@GetUser() user: getUser, @Param() params: any, @Query() query: any) {
    return this.ordersService.getPackageBrands(user, params, query);
  }

  @Get(':orderId/brands/:brandId/products')
  getPackageBrandProducts(@Param() params: any, @Query() query: any) {
    return this.ordersService.getPackageBrandProducts(params, query);
  }

  @Post('updateBrandQty')
  updateBrandQty(@Body() body: any) {
    return this.ordersService.updateVarientQuantity(body);
  }

  @Post('updateAccessBrandQty')
  updateAccessBrandQty(@Body() body: any) {
    return this.ordersService.updateAccessVarientQuantity(body);
  }

  @Post('saveOrderAsDraft')
  saveOrderAsDraft(@GetUser() user: getUser, @Body() body: any) {
    return this.ordersService.saveOrderAsDraft(user, body);
  }

  @Post('createOrder')
  createOrder(@GetUser() user: getUser, @Body() body: any) {
    return this.ordersService.createOrder(user, body);
  }

  @Post(':orderId/confirm')
  confirmOrder(
    @Param('orderId') orderId: number,
    @GetUser() user: getUser,
    @Body() body: any,
    @Headers('authorization') token: string,
  ) {
    return this.ordersService.confirmOrder(orderId, user, body, token);
  }

  @Post('updateOrderBrands')
  updateOrderBrands(@Body() body: any) {
    return this.ordersService.updateOrderBrands(body);
  }

  @Post('itemTotalPrice')
  itemTotalPrice(@Body() body: any) {
    return this.ordersService.itemTotalPrice(body);
  }

  @Post('totalItemCount/:orderId')
  totalItemCount(@Param('orderId') orderId: number) {
    return this.ordersService.totalItemCount(orderId);
  }

  @Get('orders-count')
  orderCount(@GetUser() user: getUser) {
    return this.ordersService.orderCount(user);
  }

  @Post('getVariantCost')
  getVariantCost(@Body() body: any) {
    return this.ordersService.getVariantCost(body);
  }

  @Post('checkStock')
  checkStock(@Body() body: any) {
    return this.ordersService.checkStock(body);
  }
}
