import {
  Body,
  Controller,
  Get,
  Inject,
  Param,
  Post,
  UseGuards,
} from '@nestjs/common';
import { GetUser } from 'src/common/decorators/get-user.decorator';
import type { getUser } from 'src/common/interfaces/common/getUser';

import { ApiTags } from '@nestjs/swagger';
import { AuthGuard } from 'src/common/guards/auth.guard';
import { UsersService } from './users.service';

@ApiTags('Users')
@Controller('user')
@UseGuards(AuthGuard)
export class UsersController {
  constructor(
    @Inject(UsersService)
    private readonly usersService: UsersService,
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
    return this.usersService.consumerList(body, user);
  }

  @Get('consumerDetails/:email')
  consumerDetails(@Param('email') email: string) {
    return this.usersService.consumerDetails(email);
  }

  @Post('updateAgentStatus')
  updateAgentStatus(@Body() body: any, @GetUser() user: getUser) {
    return this.usersService.updateAgentStatus(body, Number(user.storeId));
  }

  @Get('checkAddress')
  checkAddress(@GetUser() user: getUser) {
    return this.usersService.checkAddress(user);
  }
}
