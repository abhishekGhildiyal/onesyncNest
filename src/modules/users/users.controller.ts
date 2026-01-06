import { Controller, Get, Post, Body, Param, UseGuards, Inject } from '@nestjs/common';
import { GetUser } from 'src/common/decorators/get-user.decorator';
import type { getUser } from 'src/common/interfaces/common/getUser';

import { ApiTags } from '@nestjs/swagger';
import { UsersService } from './users.service';

@ApiTags('Users')
@Controller('user')
export class UsersController {
  constructor(
    @Inject(UsersService)
    private readonly usersService: UsersService
  ) {}

  @Get('all')
  allUsers() {
    return this.usersService.allUsers();
  }

  @Post('userSetting')
  userSetting(@Body() body: any) {
    return this.usersService.userSetting(body);
  }

  @Get('userSetting/:userId')
  getUserSetting(@Param('userId') userId: number) {
    return this.usersService.getUserSetting(userId);
  }

  @Get('getPermissions')
  getPermissions() {
    return this.usersService.getPermissions();
  }

  @Post('consumerList')
  consumerList(@Body() body: any, @GetUser() user: getUser) {
    // Legacy req.user.storeId
    const storeId = user?.storeId || 1; // Defaulting for now if guard not implemented
    return this.usersService.consumerList(body, Number(storeId));
  }

  @Get('consumerDetails/:email')
  consumerDetails(@Param('email') email: string) {
    return this.usersService.consumerDetails(email);
  }

  @Post('updateAgentStatus')
  updateAgentStatus(@Body() body: any, @GetUser() user: getUser) {
    const storeId = user?.storeId || 1;
    return this.usersService.updateAgentStatus(body, Number(storeId));
  }

  @Get('checkAddress')
  checkAddress(@GetUser() user: getUser) {
    return this.usersService.checkAddress(user);
  }
}
