import { BadRequestException, Injectable } from '@nestjs/common';
import { Sequelize } from 'sequelize-typescript';
import { getUser } from 'src/common/interfaces/common/getUser';
import { PackageRepository } from 'src/db/repository/package.repository';
import { StoreRepository } from 'src/db/repository/store.repository';
import { UserRepository } from 'src/db/repository/user.repository';
import { PACKAGE_STATUS, PAYMENT_STATUS } from '../../common/constants/enum';
import { AllMessages } from '../../common/constants/messages';
import { ROLES } from '../../common/constants/permissions';
import { compareMD5, hashPasswordMD5 } from '../../common/helpers/hash.helper';

@Injectable()
export class UsersService {
  constructor(
    private readonly userRepo: UserRepository,
    private readonly pkgRepo: PackageRepository,
    private readonly storeRepo: StoreRepository,
    private sequelize: Sequelize,
  ) {}

  async allUsers() {
    try {
      const users = await this.userRepo.userModel.findAll();
      return {
        message: AllMessages.FTCH_USERS,
        data: users,
      };
    } catch (err) {
      console.log(err);
      throw new BadRequestException({
        message: AllMessages.SMTHG_WRNG,
        success: false,
      });
    }
  }

  async userSetting(body: any) {
    try {
      const {
        userId,
        firstName,
        lastName,
        phnNo,
        oldPassword,
        newPassword,
        shippingAddress = [],
        billingAddress,
      } = body;

      const user = await this.userRepo.userModel.findOne({
        where: { id: userId },
      });

      if (!user) {
        throw new BadRequestException({
          message: AllMessages.USERS_NF,
          success: false,
        });
      }

      if (firstName) user.firstName = firstName;
      if (lastName) user.lastName = lastName;
      if (phnNo !== undefined) user.phnNo = phnNo;

      if (billingAddress) {
        const { b_address, b_address2, b_country, b_city, b_state, b_zip } = billingAddress;
        user.address = b_address;
        user.address2 = b_address2;
        user.country = b_country;
        user.city = b_city;
        user.state = b_state;
        user.zip = b_zip;
      }

      if (oldPassword && newPassword) {
        const verified = compareMD5(oldPassword, user.password);
        if (!verified) {
          throw new BadRequestException({
            message: AllMessages.PSWRD_NM,
            success: false,
          });
        }
        user.password = hashPasswordMD5(newPassword);
      }

      await this.pkgRepo.consumerShippingModel.destroy({
        where: { consumerId: userId },
      });

      if (Array.isArray(shippingAddress) && shippingAddress.length > 0) {
        let selectedSet = false;
        for (const ship of shippingAddress) {
          let { label, address, address2, country, city, state, zip, selected, sameAddress } = ship;
          if (selected && !selectedSet) {
            selectedSet = true;
          } else {
            selected = false;
          }

          await this.pkgRepo.consumerShippingModel.create({
            consumerId: userId,
            label,
            address,
            address2,
            country,
            city,
            state,
            zip,
            selected,
            sameAddress,
          });
        }
      }

      await user.save();

      return {
        success: true,
        message: AllMessages.ACC_UPDT,
      };
    } catch (err) {
      console.log('userSetting err', err);
      if (err instanceof BadRequestException) throw err;
      throw new BadRequestException({
        message: AllMessages.SMTHG_WRNG,
        success: false,
      });
    }
  }

  async getUserSetting(userId: number) {
    try {
      const userDetail = await this.userRepo.userModel.findByPk(userId);
      const shippingDetails = await this.pkgRepo.consumerShippingModel.findAll({
        where: { consumerId: userId },
      });

      return {
        success: true,
        message: AllMessages.ACC_STNG,
        data: {
          userDetail,
          shippingDetails,
        },
      };
    } catch (err) {
      console.log(err);
      throw new BadRequestException({
        message: AllMessages.SMTHG_WRNG,
        success: false,
      });
    }
  }

  async getPermissions() {
    try {
      const allPermissions = await this.userRepo.permissionModel.findAll({
        where: { isSuperAdminPermission: false },
      });

      const consumerPermissions = allPermissions.filter((p) => p.isConsumerPermission);
      const permissions = allPermissions.filter((p) => !p.isConsumerPermission);

      return {
        success: true,
        data: {
          permissions,
          consumerPermissions,
        },
      };
    } catch (err) {
      console.error('❌ getPermissions error:', err);
      throw new BadRequestException({
        message: AllMessages.SMTHG_WRNG,
        success: false,
      });
    }
  }

  async updateAgentStatus(body: any, storeId: number) {
    const t = await this.sequelize.transaction();
    try {
      const { userId, salesAgent, logisticAgent } = body;

      const user = await this.userRepo.userModel.findByPk(userId, {
        transaction: t,
      });
      if (!user) {
        await t.rollback();
        throw new BadRequestException({
          message: AllMessages.USERS_NF,
          success: false,
        });
      }

      const restrictedRoles = [ROLES.CONSIGNER, ROLES.CONSUMER];

      const mappings = (await this.userRepo.userStoreMappingModel.findAll({
        where: { userId, storeId },
        include: [
          {
            model: this.userRepo.roleModel,
            as: 'role',
            attributes: ['roleName'],
          },
        ],
        transaction: t,
      })) as any[];

      if (!mappings.length) {
        await t.rollback();
        throw new BadRequestException({
          message: 'User mapping for this store not found.',
          success: false,
        });
      }

      const validMappings = mappings.filter((m) => !restrictedRoles.includes(m.role.roleName));

      if (!validMappings.length) {
        await t.rollback();
        throw new BadRequestException({
          message: 'No valid mappings to update for this user.',
          success: false,
        });
      }

      await Promise.all(
        validMappings.map((m) =>
          m.update(
            {
              is_sales_agent: salesAgent ?? m.is_sales_agent,
              is_logistic_agent: logisticAgent ?? m.is_logistic_agent,
            },
            { transaction: t },
          ),
        ),
      );

      await t.commit();
      return {
        success: true,
        message: 'User agent status updated for all valid roles in this store.',
      };
    } catch (err) {
      if (t) await t.rollback();
      console.error('❌ updateAgentStatus error:', err);
      if (err instanceof BadRequestException) throw err;
      throw new BadRequestException({
        message: AllMessages.SMTHG_WRNG,
        success: false,
      });
    }
  }

  /**
   * @description Get consumer list
   * @param body
   * @param user
   * @returns
   */
  async consumerList(body: any, user: getUser) {
    const { storeId } = user;

    try {
      const {
        status = [PACKAGE_STATUS.IN_PROGRESS, PACKAGE_STATUS.CLOSE, PACKAGE_STATUS.COMPLETED],
        page = 1,
        limit = 10,
      } = body;

      const Nlimit = parseInt(limit);
      const offset = (parseInt(page) - 1) * Nlimit;

      const packages = await this.pkgRepo.packageOrderModel.findAll({
        where: { store_id: storeId, ...(status ? { status } : {}) },
        attributes: ['id', 'order_id', 'paymentStatus'],
        include: [
          {
            model: this.pkgRepo.packageCustomerModel,
            as: 'customers',
            attributes: ['id', 'package_id', 'customer_id'],
            include: [
              {
                model: this.userRepo.userModel,
                as: 'customer',
                attributes: ['id', 'firstName', 'lastName'],
              },
            ],
          },
          {
            model: this.pkgRepo.packageBrandModel,
            as: 'brands',
            attributes: ['id', 'selected'],
            include: [
              {
                model: this.pkgRepo.packageBrandItemsModel,
                as: 'items',
                attributes: ['id', 'consumerDemand', 'price'],
              },
            ],
          },
        ],
      });

      if (!packages.length) {
        return {
          success: true,
          message: 'No consumers found',
          data: [],
          pagination: {
            total: 0,
            totalPages: 0,
            currentPage: page,
            perPage: Nlimit,
          },
        };
      }

      // Step 2: Group by consumer
      const consumerMap = new Map();

      packages.forEach((pkg: any) => {
        pkg?.customers?.forEach((c) => {
          const user = c.customer;
          if (!user) return;

          // ✅ calculate spend for this package **only if paymentStatus is confirmed**
          let packageSpend = 0;
          if (pkg.paymentStatus === PAYMENT_STATUS.CONFIRMED) {
            pkg.brands.forEach((brand) => {
              if (brand.selected) {
                brand.items.forEach((item) => {
                  if (item.consumerDemand > 0) {
                    packageSpend += item.consumerDemand * (item.price || 0);
                  }
                });
              }
            });
          }

          if (!consumerMap.has(user.id)) {
            consumerMap.set(user.id, {
              id: user.id,
              firstName: user.firstName,
              lastName: user.lastName,
              totalSpend: 0,
              orders: [],
            });
          }

          const consumer = consumerMap.get(user.id);
          consumer.totalSpend += packageSpend; // only adds if paymentStatus === confirmed
          consumer.orders.push({
            package_id: pkg.id,
            order_id: pkg.order_id,
            spend: packageSpend, // only non-zero if confirmed
          });
        });
      });

      const consumers = [...consumerMap.values()];
      const total = consumers.length;
      const paginatedConsumers = consumers.slice(offset, offset + Nlimit);

      return {
        success: true,
        message: 'Consumer list fetched',
        data: paginatedConsumers,
        pagination: {
          total,
          totalPages: Math.ceil(total / Nlimit),
          currentPage: parseInt(page as any),
        },
      };
    } catch (err) {
      console.error('❌ consumerList error:', err);
      throw new BadRequestException({
        message: AllMessages.SMTHG_WRNG,
        success: false,
      });
    }
  }

  /**
   * @description Check address
   * @param user
   * @returns
   */
  async checkAddress(user: getUser) {
    try {
      const { userId, isConsumer, storeId } = user;
      let addressRecord;

      if (isConsumer) {
        addressRecord = await this.pkgRepo.consumerShippingModel.findOne({
          where: { consumerId: userId },
          attributes: ['country'],
        });
      } else {
        addressRecord = await this.storeRepo.storeLocationMappingModel.findOne({
          where: { store_id: storeId, default_store_location: true },
          attributes: ['country'],
        });
      }

      const addressExists = !!(addressRecord as any)?.country;
      return {
        success: true,
        message: 'Address check completed',
        data: { addressExists },
      };
    } catch (err) {
      console.error('❌ checkAddress error:', err);
      throw new BadRequestException({
        message: AllMessages.SMTHG_WRNG,
        success: false,
      });
    }
  }

  /**
   * @description Get consumer details
   * @param email
   * @returns
   */
  async consumerDetails(email: string) {
    try {
      const consumer = await this.userRepo.userModel.findOne({
        where: { email },
        include: [
          {
            model: this.userRepo.userStoreMappingModel,
            as: 'mappings',
            required: true,
            attributes: [],
          },
        ],
        attributes: ['id', 'firstName', 'lastName', 'address', 'city', 'state', 'zip', 'country', 'phnNo'],
      });

      if (!consumer) {
        return {
          success: true,
          message: 'No user found',
          consumerFound: false,
        };
      }

      return {
        success: true,
        message: 'User found',
        data: consumer,
        consumerFound: true,
      };
    } catch (err) {
      console.error('❌ consumerDetails error:', err);
      throw new BadRequestException({
        message: AllMessages.SMTHG_WRNG,
        success: false,
      });
    }
  }
}
