import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { GetUser } from 'src/common/decorators/get-user.decorator';

import { ApiTags } from '@nestjs/swagger';
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
  addAddress(@GetUser() user: any, @Body() body: AddAddressDto) {
    return this.storeService.addAddress(user, body);
  }

  @Get('address')
  getAddress(@GetUser() user: any) {
    return this.storeService.getAddress(user);
  }

  @Post('sender')
  createSender(@GetUser() user: any, @Body() body: CreateSenderDto) {
    return this.storeService.createSender(user, body);
  }

  @Get('sender/verify/:id')
  verifySender(@GetUser() user: any, @Param('id') id: string) {
    return this.storeService.verifySender(user, id);
  }

  @Post('sender/resend/:id')
  resendVerification(@Param('id') id: string) {
    return this.storeService.resendVerification(id);
  }

  @Post('email-key')
  storeEmailAndKey(@GetUser() user: any, @Body() body: EmailAndKeyDto) {
    return this.storeService.storeEmailAndKey(user, body);
  }

  @Get('email-key')
  getEmailAndKey(@GetUser() user: any) {
    return this.storeService.getEmailAndKey(user);
  }

  @Post('label-template')
  saveLabelTemplate(@GetUser() user: any, @Body() body: SaveLabelTemplateDto) {
    return this.storeService.saveLabelTemplate(user, body);
  }

  @Get('label-template/:type')
  getLabelTemplate(@GetUser() user: any, @Param('type') type: string) {
    return this.storeService.getLabelTemplate(user, type);
  }

  @Get('label-templates/both')
  getBothLabelTemplate(@GetUser() user: any) {
    return this.storeService.getBothLabelTemplate(user);
  }

  @Post('label-template/create')
  createLabelTemplate(
    @GetUser() user: any,
    @Body() body: CreateLabelTemplateDto,
  ) {
    return this.storeService.createLabelTemplate(user, body);
  }

  @Post('label-template/update')
  updateLabelTemplate(
    @GetUser() user: any,
    @Body() body: UpdateLabelTemplateDto,
  ) {
    return this.storeService.updateLabelTemplate(user, body);
  }

  @Get('getAllLabelTemplates')
  getAllLabelTemplates(@GetUser() user: any, @Query() query: any) {
    return this.storeService.getAllLabelTemplates(user, query);
  }

  @Get('label-template/by-id/:id')
  getLabelTemplateById(@GetUser() user: any, @Param('id') id: number) {
    return this.storeService.getLabelTemplateById(user, id);
  }

  @Delete('label-template/:id')
  deleteLabelTemplate(@Param('id') id: number) {
    return this.storeService.deleteLabelTemplate(id);
  }
}
