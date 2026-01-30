import { Body, Controller, Get, Param, Post, Query, UseGuards } from '@nestjs/common';
import { GetUser } from 'src/common/decorators/get-user.decorator';
import type { getUser } from 'src/common/interfaces/common/getUser';
import { AuthGuard } from '../../common/guards/auth.guard';
import { PermissionGuard } from '../../common/guards/permission.guard';
import * as DTO from './dto/store.dto';
import { StoreService } from './store.service';

@Controller('store')
@UseGuards(AuthGuard, PermissionGuard)
export class StoreController {
  constructor(private readonly storeService: StoreService) {}

  @Post('address')
  addAddress(@GetUser() user: getUser, @Body() body: DTO.AddAddressDto) {
    return this.storeService.addAddress(user, body);
  }

  @Get('address')
  getAddress(@GetUser() user: getUser) {
    return this.storeService.getAddress(user);
  }

  //   @Post('create-sender')
  //   createSender(@GetUser() user: getUser, @Body() body: DTO.CreateSenderDto) {
  //     return this.storeService.createSender(user, body);
  //   }

  //   @Get('verify-sender/:senderId')
  //   verifySender(@GetUser() user: getUser, @Param('id') id: string) {
  //     return this.storeService.verifySender(user, id);
  //   }

  //   @Post('resendMail/:senderId')
  //   resendVerification(@Param('id') id: string) {
  //     return this.storeService.resendVerification(id);
  //   }

  @Post('sendgrid-key')
  storeEmailAndKey(@GetUser() user: getUser, @Body() body: DTO.EmailAndKeyDto) {
    return this.storeService.storeEmailAndKey(user, body);
  }

  @Get('sendgrid-key')
  getEmailAndKey(@GetUser() user: getUser) {
    return this.storeService.getEmailAndKey(user);
  }

  @Post('saveLabelTemplate')
  saveLabelTemplate(@GetUser() user: getUser, @Body() body: DTO.SaveLabelTemplateDto) {
    return this.storeService.saveLabelTemplate(user, body);
  }

  @Get('getBothLabelTemplate')
  getBothLabelTemplate(@GetUser() user: getUser) {
    return this.storeService.getBothLabelTemplate(user);
  }

  /**
   |--------------------------------------------------
   | New flow for labels multiple templates
   |--------------------------------------------------
   */
  @Post('createLabelTemplate')
  createLabelTemplate(@GetUser() user: getUser, @Body() body: DTO.CreateLabelTemplateDto) {
    return this.storeService.createLabelTemplate(user, body);
  }

  @Post('updateLabelTemplate')
  updateLabelTemplate(@GetUser() user: getUser, @Body() body: DTO.UpdateLabelTemplateDto) {
    return this.storeService.updateLabelTemplate(user, body);
  }

  @Get('getAllLabelTemplates')
  getAllLabelTemplates(@GetUser() user: getUser, @Query() query: DTO.GetAllLabelTemplatesQueryDto) {
    return this.storeService.getAllLabelTemplates(user, query);
  }

  @Get('getlabelTemplate/:type')
  getLabelTemplate(@GetUser() user: getUser, @Param('type') type: string) {
    return this.storeService.getLabelTemplate(user, type);
  }

  @Get('getTemplate/:id')
  getLabelTemplateById(@GetUser() user: getUser, @Param('id') id: number) {
    return this.storeService.getLabelTemplateById(user, id);
  }

  @Get('deleteTemplate/:id')
  deleteLabelTemplate(@Param('id') id: number) {
    return this.storeService.deleteLabelTemplate(id);
  }
}
