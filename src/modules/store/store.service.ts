import { BadRequestException, Injectable } from '@nestjs/common';
import sgClient from '@sendgrid/client';
import { Op } from 'sequelize';
import { PackageRepository } from 'src/db/repository/package.repository';
import { ProductRepository } from 'src/db/repository/product.repository';
import { StoreRepository } from 'src/db/repository/store.repository';
import { AllMessages } from '../../common/constants/messages';
import * as DTO from './dto/store.dto';

@Injectable()
export class StoreService {
  constructor(
    private readonly storeRepo: StoreRepository,
    private readonly pkgRepo: PackageRepository,
    private readonly productRepo: ProductRepository,
  ) {
    if (process.env.SENDGRID_API_KEY) {
      sgClient.setApiKey(process.env.SENDGRID_API_KEY);
    }
  }

  /**
   * @description Add store and its shipping orders
   */
  async addAddress(user: any, body: DTO.AddAddressDto) {
    if (!this.storeRepo.storeModel.sequelize) {
      throw new BadRequestException({
        message: 'Sequelize not initialized',
        success: false,
      });
    }

    const transaction = await this.storeRepo.storeModel.sequelize.transaction();
    try {
      const { storeId } = user;
      const { storeAddress, shippingAddress = [] } = body;

      // ✅ Update store default location
      if (storeAddress) {
        const { s_country, s_address, s_address2, s_city, s_state, s_zip } = storeAddress;

        await this.storeRepo.storeLocationMappingModel.update(
          {
            country: s_country,
            address1: s_address,
            address2: s_address2,
            city: s_city,
            province: s_state,
            zip: s_zip,
          },
          { where: { store_id: storeId, default_store_location: true }, transaction },
        );
      }

      // ✅ Handle shipping addresses
      if (shippingAddress.length > 0) {
        await this.storeRepo.storeAddressModel.destroy({ where: { storeId }, transaction });

        const newAddresses = shippingAddress.map((addr: DTO.ShippingAddressItemDto) => ({
          storeId,
          label: addr.label || 'Address',
          country: addr.country,
          address: addr.address,
          address2: addr.address2,
          city: addr.city,
          state: addr.state,
          zip: addr.zip,
          isBilling: addr.isBilling ?? false,
          sameAddress: addr.sameAddress ?? false,
          selected: addr.selected ?? false,
        }));

        // ✅ Bulk insert all new addresses
        await this.storeRepo.storeAddressModel.bulkCreate(newAddresses, { transaction });
      }

      await transaction.commit();

      return {
        success: true,
        message: 'Address(es) saved successfully',
      };
    } catch (err) {
      await transaction.rollback();
      console.error('❌ addAddress error:', err);
      throw new BadRequestException({
        success: false,
        message: AllMessages.SMTHG_WRNG,
      });
    }
  }

  /**
   * @description Get store and its shipping orders
   */
  async getAddress(user: any) {
    try {
      const { storeId } = user;

      const storeAddress = await this.storeRepo.storeLocationMappingModel.findOne({
        where: { store_id: storeId, default_store_location: true },
        raw: true,
      });

      const shippingAddress = await this.storeRepo.storeAddressModel.findAll({
        where: { storeId },
        raw: true,
      });

      return {
        success: true,
        data: { storeAddress, shippingAddress },
        message: AllMessages.ADDR_FTCH,
      };
    } catch (err) {
      console.error('❌ getAddress error:', err);
      throw new BadRequestException({
        success: false,
        message: AllMessages.SMTHG_WRNG,
      });
    }
  }

  /**
   * @description Create sender in SendGrid
   */
  async createSender(user: any, body: DTO.CreateSenderDto) {
    try {
      const { email, name, address, city, state, zip, country } = body;
      const { storeId } = user;

      const store = await this.storeRepo.storeLocationMappingModel.findOne({
        where: { store_id: storeId, default_store_location: true },
        attributes: ['address1', 'city', 'country', 'province_code', 'zip'],
      });

      const request = {
        method: 'POST' as const,
        url: '/v3/verified_senders',
        body: {
          nickname: name || 'Store Sender',
          from_email: email,
          from_name: name || 'Store',
          reply_to: email,
          reply_to_name: name || 'Store',
          address: address || store?.address1,
          city: city || store?.city,
          state: state || store?.province_code,
          zip: zip || store?.zip,
          country: country || store?.country,
        },
      };

      const [response, responseBody] = await sgClient.request(request);
      console.log('response', response, 'bodyy-----', responseBody);

      // StoreSenderEmailModel is commented out as it's missing in repositories
      // await StoreSenderEmailModel.create({ tempSenderId: responseBody.id, senderEmail: email, storeId });

      return {
        success: true,
        message: 'Verification email sent. Please check your inbox and verify within 24 hours.',
        senderId: responseBody.id,
      };
    } catch (err) {
      console.error('❌ createSender error:', err.response?.body || err.message);
      throw new BadRequestException({
        success: false,
        message: err.response?.body?.errors?.[0]?.message || AllMessages.SMTHG_WRNG,
      });
    }
  }

  /**
   * @description Check if sender is verified
   */
  async verifySender(user: any, senderId: string) {
    try {
      const { storeId } = user;

      const request = {
        method: 'GET' as const,
        url: '/v3/verified_senders',
      };

      const [response, body] = await sgClient.request(request);
      // console.log("body", body);

      // Find sender by ID
      const sender = body?.results?.find((s) => String(s.id) === String(senderId));

      if (!sender) {
        throw new BadRequestException({
          success: false,
          message: 'Sender not found in SendGrid.',
        });
      }

      if (!sender.verified) {
        return {
          success: false,
          message: 'Sender email is not yet verified.',
          data: sender,
          showResend: true,
        };
      }

      // Mark verified in DB - model missing
      // await StoreSenderEmailModel.update({ senderEmailVerified: true }, { where: { storeId, tempSenderId: senderId } });

      return {
        success: true,
        message: 'Email verified successfully!',
        data: sender,
      };
    } catch (err) {
      console.error('❌ verifySender error:', err.response?.body || err.message);
      throw new BadRequestException({
        success: false,
        message: err.response?.body?.errors?.[0]?.message || err.message,
      });
    }
  }

  /**
   * @description Resend verification mail
   */
  async resendVerification(senderId: string) {
    try {
      console.log('senderID', senderId);

      const request = {
        method: 'POST' as const,
        url: '/v3/verified_senders/resend_verification',
        body: { sender_id: Number(senderId) },
      };

      const [response, body] = await sgClient.request(request);

      console.log('body', body);

      return {
        success: true,
        message: 'Verification email resent successfully.',
        data: body,
      };
    } catch (err) {
      console.error('❌ resendVerification error:', err);
      throw new BadRequestException({
        success: false,
        message: AllMessages.SMTHG_WRNG,
      });
    }
  }

  /**
  |--------------------------------------------------
  | @description Store sendgrid api key and from email
  |--------------------------------------------------
  */
  async storeEmailAndKey(user: any, body: DTO.EmailAndKeyDto) {
    try {
      const { storeId } = user;
      const { apiKey, senderEmail } = body;

      await this.storeRepo.storeModel.update(
        { sendgridApiKey: apiKey, sendgridFromEmail: senderEmail },
        { where: { store_id: storeId } },
      );

      return {
        success: true,
        message: AllMessages.SENDGRID_API,
      };
    } catch (err) {
      console.error('❌ storeEmailAndKey error:', err);
      throw new BadRequestException({
        success: false,
        message: AllMessages.SMTHG_WRNG,
      });
    }
  }

  /**
   * @description Get sendgrid api key and mail
   */
  async getEmailAndKey(user: any) {
    try {
      const { storeId } = user;
      const store = await this.storeRepo.storeModel.findOne({
        where: { store_id: storeId },
        attributes: ['sendgridApiKey', 'sendgridFromEmail'],
      });

      if (!store) {
        throw new BadRequestException({
          success: false,
          message: 'Store not found.',
        });
      }

      return {
        success: true,
        data: store,
      };
    } catch (err) {
      console.error('❌ getEmailAndKey error:', err);
      throw new BadRequestException({
        success: false,
        message: AllMessages.SMTHG_WRNG,
      });
    }
  }

  /**
   * @description Save label template
   */
  async saveLabelTemplate(user: any, body: DTO.SaveLabelTemplateDto) {
    try {
      const { storeId } = user;
      const { templateData, label, type } = body;

      const store = await this.storeRepo.storeModel.findByPk(storeId);
      if (store) {
        const storeData: any = store;
        if (type === 'product') {
          storeData.productLabel = label;
          storeData.productTemplate = templateData;
        } else if (type === 'inventory') {
          storeData.inventoryLabel = label;
          storeData.inventoryTemplate = templateData;
        }
        await store.save();
      }

      return {
        success: true,
        message: AllMessages.LBL_SVD,
      };
    } catch (err) {
      console.error('❌ saveLabelTemplate error:', err);
      throw new BadRequestException({
        success: false,
        message: AllMessages.SMTHG_WRNG,
      });
    }
  }

  /**
   * @description Get label template
   */
  async getLabelTemplate(user: any, type: string) {
    try {
      const labels = await this.productRepo.labelModel.findAll({
        where: { store_id: user.storeId, template_type: type },
      });

      if (!labels) {
        return {
          success: true,
          data: [],
        };
      }

      return {
        success: true,
        data: labels,
      };
    } catch (err) {
      console.error('❌ getLabeltemplate error:', err);
      throw new BadRequestException({
        success: false,
        message: AllMessages.SMTHG_WRNG,
      });
    }
  }

  /**
   * @description Get both label templates (product and inventory)
   */
  async getBothLabelTemplate(user: any) {
    try {
      const { storeId } = user;

      const store = await this.storeRepo.storeModel.findByPk(storeId);
      if (!store) {
        throw new BadRequestException({
          success: false,
          message: 'Store not found.',
        });
      }

      const storeData: any = store;
      const labelData = {
        productLabel: storeData.productLabel,
        productTemplate: storeData.productTemplate,
        inventoryLabel: storeData.inventoryLabel,
        inventoryTemplate: storeData.inventoryTemplate,
      };

      return {
        success: true,
        data: labelData,
      };
    } catch (err) {
      console.error('❌ getLabeltemplate error:', err);
      throw new BadRequestException({
        success: false,
        message: AllMessages.SMTHG_WRNG,
      });
    }
  }

  /**
   * @description Create new template
   */
  async createLabelTemplate(user: any, body: DTO.CreateLabelTemplateDto) {
    try {
      const { storeId } = user;
      const { name, templateData, label, type } = body;

      const existingLabel = await this.productRepo.labelModel.findOne({
        where: { store_id: storeId, label_name: name },
      });

      if (existingLabel) {
        throw new BadRequestException({
          success: false,
          message: AllMessages.LBL_EXST,
        });
      }

      await this.productRepo.labelModel.create({
        store_id: storeId,
        label_name: name + ' ' + type,
        label_dimension: label,
        label_template: templateData,
        template_type: type,
      });

      return {
        success: true,
        message: AllMessages.LBL_SVD,
      };
    } catch (err) {
      console.error('❌ createLabelTemplate error:', err);
      throw new BadRequestException({
        success: false,
        message: AllMessages.SMTHG_WRNG,
      });
    }
  }

  /**
   * @description Update label template
   */
  async updateLabelTemplate(user: any, body: DTO.UpdateLabelTemplateDto) {
    try {
      const { storeId } = user;
      const { id, name, templateData, label, type } = body;

      const dbLabel = await this.productRepo.labelModel.findOne({
        where: { store_id: storeId, id },
      });

      if (!dbLabel) {
        throw new BadRequestException({
          success: false,
          message: 'Label not found.',
        });
      }

      dbLabel.label_name = name;
      dbLabel.label_dimension = label;
      dbLabel.label_template = templateData;
      dbLabel.template_type = type;

      await dbLabel.save();

      return {
        success: true,
        message: AllMessages.LBL_UPDT,
      };
    } catch (err) {
      console.error('❌ updateLabelTemplate error:', err);
      throw new BadRequestException({
        success: false,
        message: AllMessages.SMTHG_WRNG,
      });
    }
  }

  /**
   * @description Get all label templaets
   */
  async getAllLabelTemplates(user: any, query: DTO.GetAllLabelTemplatesQueryDto) {
    try {
      const { search = '', page = 1, limit = 10, type } = query;

      const offset = (page - 1) * limit;

      const whereCondition: any = {
        store_id: user.storeId,
        deleted_at: null,
      };

      if (search) {
        whereCondition.label_name = { [Op.like]: `%${search}%` };
      }

      if (type) {
        whereCondition.template_type = type;
      }

      const { rows, count } = await this.productRepo.labelModel.findAndCountAll({
        where: whereCondition,
        limit: Number(limit),
        offset,
        attributes: ['id', 'label_name', 'label_dimension', 'template_type'],
        order: [['id', 'DESC']],
      });

      return {
        success: true,
        data: rows,
        pagination: {
          total: count,
          currentPage: Number(page),
          totalPages: Math.ceil(count / limit),
        },
      };
    } catch (err) {
      console.log('err', err);
      throw new BadRequestException({
        success: false,
        message: AllMessages.SMTHG_WRNG,
      });
    }
  }

  /**
   * @description Get single label template
   */
  async getLabelTemplateById(user: any, id: number) {
    try {
      const label = await this.productRepo.labelModel.findOne({
        where: { store_id: user.storeId, id },
      });

      if (!label) {
        throw new BadRequestException({
          success: false,
          message: 'Label not found.',
        });
      }

      return {
        success: true,
        data: label,
      };
    } catch (err) {
      console.error('❌ getLabeltemplate error:', err);
      throw new BadRequestException({
        success: false,
        message: AllMessages.SMTHG_WRNG,
      });
    }
  }

  /**
   * @description Delete label template
   */
  async deleteLabelTemplate(id: number) {
    try {
      const assigned = await this.productRepo.templateModel.findOne({
        where: {
          [Op.or]: [{ display_label_id: id }, { item_label_id: id }],
        },
      });

      if (assigned) {
        throw new BadRequestException({
          success: false,
          message: 'Assigned label cannot be deleted.',
        });
      }

      await this.productRepo.labelModel.update({ deleted_at: new Date() }, { where: { id } });
      return {
        success: true,
        message: AllMessages.LBL_DLT,
      };
    } catch (err) {
      console.error('❌ deleteLabelTemplate error:', err);
      throw new BadRequestException({
        success: false,
        message: AllMessages.SMTHG_WRNG,
      });
    }
  }
}
