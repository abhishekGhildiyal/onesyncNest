import { Body, Controller, Delete, Get, Param, Post, UseGuards } from '@nestjs/common';
import { GetUser } from 'src/common/decorators/get-user.decorator';

import { ApiTags } from '@nestjs/swagger';
import type { getUser } from 'src/common/interfaces/common/getUser';
import { AuthGuard } from '../../common/guards/auth.guard';
import { PermissionGuard } from '../../common/guards/permission.guard';
import {
  AddAddressDto,
  CreateLabelTemplateDto,
  CreateSenderDto,
  EmailAndKeyDto,
  SaveLabelTemplateDto,
  UpdateLabelTemplateDto,
} from './dto/store.dto';
import { StoreService } from './store.service';

@ApiTags('Store')
@Controller('store')
@UseGuards(AuthGuard, PermissionGuard)
export class StoreController {
  constructor(private readonly storeService: StoreService) {}

  @Post('address')
  addAddress(@GetUser() user: getUser, @Body() body: AddAddressDto) {
    return this.storeService.addAddress(user, body);
  }

  @Get('address')
  getAddress(@GetUser() user: getUser) {
    return this.storeService.getAddress(user);
  }

  @Post('sender')
  createSender(@GetUser() user: getUser, @Body() body: CreateSenderDto) {
    return this.storeService.createSender(user, body);
  }

  @Get('sender/verify/:id')
  verifySender(@GetUser() user: getUser, @Param('id') id: string) {
    return this.storeService.verifySender(user, id);
  }

  @Post('sender/resend/:id')
  resendVerification(@Param('id') id: string) {
    return this.storeService.resendVerification(id);
  }

  @Post('email-key')
  storeEmailAndKey(@GetUser() user: getUser, @Body() body: EmailAndKeyDto) {
    return this.storeService.storeEmailAndKey(user, body);
  }

  @Get('email-key')
  getEmailAndKey(@GetUser() user: getUser) {
    return this.storeService.getEmailAndKey(user);
  }

  @Post('label-template')
  saveLabelTemplate(@GetUser() user: getUser, @Body() body: SaveLabelTemplateDto) {
    return this.storeService.saveLabelTemplate(user, body);
  }

  @Get('label-template/:type')
  getLabelTemplate(@GetUser() user: getUser, @Param('type') type: string) {
    return this.storeService.getLabelTemplate(user, type);
  }

  @Get('label-templates/both')
  getBothLabelTemplate(@GetUser() user: getUser) {
    return this.storeService.getBothLabelTemplate(user);
  }

  @Post('createLabelTemplate')
  createLabelTemplate(@GetUser() user: getUser, @Body() body: CreateLabelTemplateDto) {
    return this.storeService.createLabelTemplate(user, body);
  }

  @Post('updateLabelTemplate')
  updateLabelTemplate(@GetUser() user: getUser, @Body() body: UpdateLabelTemplateDto) {
    return this.storeService.updateLabelTemplate(user, body);
  }

  @Get('getlabelTemplate/:type')
  getAllLabelTemplates(@GetUser() user: getUser, @Param('type') type: string) {
    return this.storeService.getAllLabelTemplates(user, type);
  }

  @Get('getTemplate/:id')
  getLabelTemplateById(@GetUser() user: getUser, @Param('id') id: number) {
    return this.storeService.getLabelTemplateById(user, id);
  }

  @Delete('deleteTemplate/:id')
  deleteLabelTemplate(@Param('id') id: number) {
    return this.storeService.deleteLabelTemplate(id);
  }
}
