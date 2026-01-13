import {
  Body,
  Controller,
  Get,
  Headers,
  Param,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { GetUser } from 'src/common/decorators/get-user.decorator';

import { ApiTags } from '@nestjs/swagger';
import { AuthGuard } from 'src/common/guards/auth.guard';
import type { getUser } from 'src/common/interfaces/common/getUser';
import * as DTO from './dto/orders.dto';
import { OrdersService } from './orders.service';

@ApiTags('Orders')
@Controller('order')
@UseGuards(AuthGuard)
export class OrdersController {
  constructor(private readonly ordersService: OrdersService) {}

  @Post('storeOrders')
  storeOrders(@GetUser() user: getUser, @Body() body: DTO.StoreOrderDto) {
    return this.ordersService.storeOrders(user, body);
  }

  @Post('accessList')
  accessList(@GetUser() user: any = { userId: 1 }, @Body() body: any) {
    return this.ordersService.accessList(user, body);
  }

  @Post('getAll')
  allOrders(@GetUser() user: any = { userId: 1 }, @Body() body: any) {
    return this.ordersService.allOrders(user, body);
  }

  @Get(':orderId/brands')
  getPackageBrands(
    @GetUser() user: any = { userId: 1, roleName: 'Admin' },
    @Param() params: any,
    @Query() query: any,
  ) {
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

  @Post('setItemPrice')
  setItemPrice(@GetUser() user: any = { userId: 1 }, @Body() body: any) {
    return this.ordersService.setItemPrice(user, body);
  }

  @Post('saveOrderAsDraft')
  saveOrderAsDraft(@GetUser() user: any = { userId: 1 }, @Body() body: any) {
    return this.ordersService.saveOrderAsDraft(user, body);
  }

  @Post('createOrder')
  createOrder(@GetUser() user: any = { userId: 1 }, @Body() body: any) {
    return this.ordersService.createOrder(user, body);
  }

  @Post('createManualOrder')
  createManualOrder(@GetUser() user: any = { userId: 1 }, @Body() body: any) {
    return this.ordersService.createManualOrder(user, body);
  }

  @Get(':orderId/brands/:brandId/manualProducts')
  manualProducts(@Param() params: any) {
    return this.ordersService.manualProducts(params);
  }

  @Post(':orderId/initiate')
  initiateOrder(
    @Param('orderId') orderId: number,
    @GetUser() user: any = { userId: 1 },
  ) {
    return this.ordersService.initiateOrder(orderId, user);
  }

  @Post(':orderId/markReview')
  markReview(
    @Param('orderId') orderId: number,
    @GetUser() user: any = { userId: 1 },
  ) {
    return this.ordersService.markReview(orderId, user);
  }

  @Post(':orderId/confirm')
  confirmOrder(
    @Param('orderId') orderId: number,
    @GetUser() user: any = { userId: 1 },
    @Body() body: any,
    @Headers('authorization') token: string,
  ) {
    return this.ordersService.confirmOrder(orderId, user, body, token);
  }

  @Post('updateOrderBrands')
  updateOrderBrands(@Body() body: any) {
    return this.ordersService.updateOrderBrands(body);
  }
  @Get('allOrderItems/price/:orderId')
  getAllOrderItemsPrice(@Param('orderId') orderId: number) {
    return this.ordersService.getAllOrderItemsPrice(orderId);
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
  orderCount(@GetUser() user: any) {
    return this.ordersService.orderCount(user);
  }

  @Get('agentList/:type')
  agentList(@GetUser() user: any = { userId: 1 }, @Param('type') type: string) {
    return this.ordersService.agentList(user, type);
  }

  @Post('startOrderProcess')
  startOrderProcess(@GetUser() user: any = { userId: 1 }, @Body() body: any) {
    return this.ordersService.startOrderProcess(user, body);
  }

  @Post('assignSalesAgent')
  assignSalesAgent(@Body() body: any) {
    return this.ordersService.assignSalesAgent(body);
  }

  @Post('addNotes')
  addNotes(@Body() body: any) {
    return this.ordersService.addNotes(body);
  }

  @Get('getNotes/:orderId')
  getNotes(@Param('orderId') orderId: number) {
    return this.ordersService.getNotes(orderId);
  }

  @Post('store-confirm/:orderId')
  storeConfirm(
    @Param('orderId') orderId: number,
    @GetUser() user: any = { userId: 1 },
    @Body() body: any,
    @Headers('authorization') token: string,
  ) {
    return this.ordersService.storeConfirm(orderId, user, body, token);
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
