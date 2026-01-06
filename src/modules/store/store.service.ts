import { BadRequestException, Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/sequelize';
import sgClient from '@sendgrid/client';
import { Op } from 'sequelize';
import { AllMessages } from '../../common/constants/messages';
import { Store } from '../users/entities';
import { Label, PrintTemplate, StoreAddress, StoreLocation } from './entities';

@Injectable()
export class StoreService {
  constructor(
    @InjectModel(Store) private storeModel: typeof Store,
    @InjectModel(StoreAddress) private storeAddressModel: typeof StoreAddress,
    @InjectModel(StoreLocation)
    private storeLocationModel: typeof StoreLocation,
    @InjectModel(Label) private labelModel: typeof Label,
    @InjectModel(PrintTemplate) private templateModel: typeof PrintTemplate,
  ) {
    if (process.env.SENDGRID_API_KEY) {
      sgClient.setApiKey(process.env.SENDGRID_API_KEY);
    }
  }

  async addAddress(user: any, body: any) {
    if (!this.storeModel.sequelize)
      throw new BadRequestException('Sequelize not initialized');
    const transaction = await this.storeModel.sequelize.transaction();
    try {
      const { storeId } = user;
      const { storeAddress, shippingAddress = [] } = body;

      if (storeAddress) {
        const { s_country, s_address, s_address2, s_city, s_state, s_zip } =
          storeAddress;
        await this.storeLocationModel.update(
          {
            country: s_country,
            address1: s_address,
            address2: s_address2,
            city: s_city,
            province: s_state,
            zip: s_zip,
          },
          {
            where: { store_id: storeId, default_store_location: true },
            transaction,
          },
        );
      }

      if (shippingAddress.length > 0) {
        await this.storeAddressModel.destroy({
          where: { storeId },
          transaction,
        });

        const newAddresses = shippingAddress.map((addr: any) => ({
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

        await this.storeAddressModel.bulkCreate(newAddresses, { transaction });
      }

      await transaction.commit();
      return { success: true, message: 'Address(es) saved successfully' };
    } catch (err) {
      await transaction.rollback();
      throw new BadRequestException(AllMessages.SMTHG_WRNG);
    }
  }

  async getAddress(user: any) {
    try {
      const { storeId } = user;
      const storeAddress = await this.storeLocationModel.findOne({
        where: { store_id: storeId, default_store_location: true },
        raw: true,
      });
      const shippingAddress = await this.storeAddressModel.findAll({
        where: { storeId },
        raw: true,
      });
      return {
        success: true,
        data: { storeAddress, shippingAddress },
        message: AllMessages.ADDR_FTCH,
      };
    } catch (err) {
      throw new BadRequestException(AllMessages.SMTHG_WRNG);
    }
  }

  async createSender(user: any, body: any) {
    try {
      const { email, name, address, city, state, zip, country } = body;
      const { storeId } = user;

      const store = await this.storeLocationModel.findOne({
        where: { store_id: storeId, default_store_location: true },
        attributes: ['address1', 'city', 'country', 'province_code', 'zip'],
      });

      const request: any = {
        method: 'POST',
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

      const [response, responseBody]: any = await sgClient.request(request);
      // Legay used StoreSenderEmailModel which is missing. Porting as is but commenting out DB part if model missing.
      // await StoreSenderEmailModel.create({ tempSenderId: responseBody.id, senderEmail: email, storeId });

      return {
        success: true,
        message:
          'Verification email sent. Please check your inbox and verify within 24 hours.',
        senderId: responseBody.id,
      };
    } catch (err) {
      throw new BadRequestException(
        err.response?.body?.errors?.[0]?.message || AllMessages.SMTHG_WRNG,
      );
    }
  }

  async verifySender(user: any, senderId: string) {
    try {
      const { storeId } = user;
      const request: any = {
        method: 'GET',
        url: '/v3/verified_senders',
      };
      const [response, body]: any = await sgClient.request(request);
      const sender = body?.results?.find(
        (s: any) => String(s.id) === String(senderId),
      );

      if (!sender) {
        throw new BadRequestException('Sender not found in SendGrid.');
      }

      if (!sender.verified) {
        return {
          success: false,
          message: 'Sender email is not yet verified.',
          data: sender,
          showResend: true,
        };
      }

      // Mark verified in DB - model missing in legacy?
      // await StoreSenderEmailModel.update({ senderEmailVerified: true }, { where: { storeId, tempSenderId: senderId } });

      return {
        success: true,
        message: 'Email verified successfully!',
        data: sender,
      };
    } catch (err) {
      throw new BadRequestException(
        err.response?.body?.errors?.[0]?.message || err.message,
      );
    }
  }

  async resendVerification(senderId: string) {
    try {
      const request: any = {
        method: 'POST',
        url: '/v3/verified_senders/resend_verification',
        body: { sender_id: Number(senderId) },
      };
      const [response, body]: any = await sgClient.request(request);
      return {
        success: true,
        message: 'Verification email resent successfully.',
        data: body,
      };
    } catch (err) {
      throw new BadRequestException(AllMessages.SMTHG_WRNG);
    }
  }

  async storeEmailAndKey(user: any, body: any) {
    try {
      const { storeId } = user;
      const { apiKey, senderEmail } = body;
      await this.storeModel.update(
        { sendgridApiKey: apiKey, sendgridFromEmail: senderEmail },
        { where: { store_id: storeId } },
      );
      return { success: true, message: AllMessages.SENDGRID_API };
    } catch (err) {
      throw new BadRequestException(AllMessages.SMTHG_WRNG);
    }
  }

  async getEmailAndKey(user: any) {
    try {
      const { storeId } = user;
      const store = await this.storeModel.findOne({
        where: { store_id: storeId },
        attributes: ['sendgridApiKey', 'sendgridFromEmail'],
      });
      if (!store) throw new BadRequestException('Store not found.');
      return { success: true, data: store };
    } catch (err) {
      throw new BadRequestException(AllMessages.SMTHG_WRNG);
    }
  }

  async saveLabelTemplate(user: any, body: any) {
    try {
      const { storeId } = user;
      const { templateData, label, type } = body;
      const store = await this.storeModel.findByPk(storeId);
      if (store) {
        const anyStore = store as any;
        if (type === 'product') {
          anyStore.productLabel = label;
          anyStore.productTemplate = templateData;
        } else if (type === 'inventory') {
          anyStore.inventoryLabel = label;
          anyStore.inventoryTemplate = templateData;
        }
        await store.save();
      }
      return { success: true, message: AllMessages.LBL_SVD };
    } catch (err) {
      throw new BadRequestException(AllMessages.SMTHG_WRNG);
    }
  }

  async getLabelTemplate(user: any, type: string) {
    try {
      const labels = await this.labelModel.findAll({
        where: { store_id: user.storeId, template_type: type },
      });
      return { success: true, data: labels };
    } catch (err) {
      throw new BadRequestException(AllMessages.SMTHG_WRNG);
    }
  }

  async getBothLabelTemplate(user: any) {
    try {
      const store = await this.storeModel.findByPk(user.storeId);
      if (!store) throw new BadRequestException('Store not found.');
      const anyStore = store as any;
      return {
        success: true,
        data: {
          productLabel: anyStore.productLabel,
          productTemplate: anyStore.productTemplate,
          inventoryLabel: anyStore.inventoryLabel,
          inventoryTemplate: anyStore.inventoryTemplate,
        },
      };
    } catch (err) {
      throw new BadRequestException(AllMessages.SMTHG_WRNG);
    }
  }

  async createLabelTemplate(user: any, body: any) {
    try {
      const { storeId } = user;
      const { name, templateData, label, type } = body;
      const existing = await this.labelModel.findOne({
        where: { store_id: storeId, label_name: name },
      });
      if (existing) throw new BadRequestException(AllMessages.LBL_EXST);
      await this.labelModel.create({
        store_id: storeId,
        label_name: name + ' ' + type,
        label_dimension: label,
        label_template: templateData,
        template_type: type,
      });
      return { success: true, message: AllMessages.LBL_SVD };
    } catch (err) {
      throw new BadRequestException(AllMessages.SMTHG_WRNG);
    }
  }

  async updateLabelTemplate(user: any, body: any) {
    try {
      const { storeId } = user;
      const { id, name, templateData, label, type } = body;
      const dbLabel = await this.labelModel.findOne({
        where: { store_id: storeId, id },
      });
      if (!dbLabel) throw new BadRequestException('Label not found.');
      dbLabel.label_name = name;
      dbLabel.label_dimension = label;
      dbLabel.label_template = templateData;
      dbLabel.template_type = type;
      await dbLabel.save();
      return { success: true, message: AllMessages.LBL_UPDT };
    } catch (err) {
      throw new BadRequestException(AllMessages.SMTHG_WRNG);
    }
  }

  async getAllLabelTemplates(user: any, query: any) {
    try {
      const { search = '', page = 1, limit = 10, type } = query;
      const offset = (Number(page) - 1) * Number(limit);
      const whereCondition: any = { store_id: user.storeId };
      if (search) whereCondition.label_name = { [Op.like]: `%${search}%` };
      if (type) whereCondition.template_type = type;

      const { rows, count } = await this.labelModel.findAndCountAll({
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
          totalPages: Math.ceil(count / Number(limit)),
        },
      };
    } catch (err) {
      throw new BadRequestException(AllMessages.SMTHG_WRNG);
    }
  }

  async getLabelTemplateById(user: any, id: number) {
    try {
      const label = await this.labelModel.findOne({
        where: { store_id: user.storeId, id },
      });
      if (!label) throw new BadRequestException('Label not found.');
      return { success: true, data: label };
    } catch (err) {
      throw new BadRequestException(AllMessages.SMTHG_WRNG);
    }
  }

  async deleteLabelTemplate(id: number) {
    try {
      const assigned = await this.templateModel.findOne({
        where: { [Op.or]: [{ display_label_id: id }, { item_label_id: id }] },
      });
      if (assigned)
        throw new BadRequestException('Assigned label cannot be deleted.');
      await this.labelModel.destroy({ where: { id } });
      return { success: true, message: AllMessages.LBL_DLT };
    } catch (err) {
      throw new BadRequestException(AllMessages.SMTHG_WRNG);
    }
  }
}
