import { BadRequestException, Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as crypto from 'crypto';
import { Templates } from 'src/common/constants/mailTemplates';
import { AllMessages } from 'src/common/constants/messages';
import { hashPasswordMD5 } from 'src/common/helpers/hash.helper';
import { UserRepository } from 'src/db/repository/user.repository';
import { TemplatesSlug } from '../mail/mail.constants';
import { MailService } from '../mail/mail.service';

@Injectable()
export class OnboardingService {
  constructor(
    private readonly userRepo: UserRepository,
    private readonly mailService: MailService,
    private readonly configService: ConfigService,
  ) {}

  async forgotPassword(body: { email: string }) {
    try {
      let { email } = body;
      email = email.toLowerCase();

      const user = await this.userRepo.userModel.findOne({
        where: { email },
        attributes: ['id', 'email', 'firstName', 'lastName'],
      });

      if (!user) {
        throw new BadRequestException({ success: false, message: AllMessages.USERS_NF });
      }

      const newToken = crypto.randomBytes(32).toString('hex');
      const expiresAt = new Date();
      expiresAt.setMinutes(expiresAt.getMinutes() + 10);

      const tokenExists = await this.userRepo.userForgotTokenModel.findOne({
        where: { user_id: user.id },
      });

      if (tokenExists) {
        const d1 = new Date(tokenExists.updatedAt || tokenExists.createdAt);
        d1.setMinutes(d1.getMinutes() + 1);
        if (d1 > new Date()) {
          throw new BadRequestException({
            success: false,
            message:
              'You have already requested a password reset recently. Please wait a minute before requesting again.',
          });
        }
        tokenExists.token = newToken;
        tokenExists.expires_at = expiresAt;
        await tokenExists.save();
      } else {
        await this.userRepo.userForgotTokenModel.create({
          user_id: user.id,
          token: newToken,
          expires_at: expiresAt,
        });
      }

      const frontendURL = this.configService.get<string>('FRONTEND_URL') || '';
      const tokenURL = `${frontendURL}reset-password?token=${newToken}`;

      const template = Templates.find((t) => t.slug === TemplatesSlug.PasswordReset);
      if (!template) {
        throw new BadRequestException({ success: false, message: 'Email template not found.' });
      }

      const variables: Record<string, string> = {
        '{{project}}': this.configService.get<string>('PROJECT_NAME') || 'OneSync',
        '{{link}}': tokenURL,
        '{{supportEmail}}': this.configService.get<string>('SUPPORT_EMAIL') || '',
        '{{frontendURL}}': frontendURL,
        '{{twitterLink}}': this.configService.get<string>('TWITTER_LINK') || '#',
        '{{fbLink}}': this.configService.get<string>('FB_LINK') || '#',
        '{{instaLink}}': this.configService.get<string>('INSTA_LINK') || '#',
      };

      let newTemplate = template.html;
      let subject = template.subject;

      for (const [key, value] of Object.entries(variables)) {
        newTemplate = newTemplate.replace(new RegExp(key, 'g'), value);
        subject = subject.replace(new RegExp(key, 'g'), value);
      }

      await this.mailService.sendMail(email, newTemplate, subject);

      return {
        success: true,
        message: 'Reset link sent! Check your email for instructions to reset your password.',
      };
    } catch (error) {
      if (error instanceof BadRequestException) throw error;
      console.log('forgotPassword-->', error);
      throw new BadRequestException({ success: false, message: AllMessages.SMTHG_WRNG });
    }
  }

  async verifyResetToken(token: string) {
    try {
      const tokenExists = await this.userRepo.userForgotTokenModel.findOne({
        where: { token },
      });

      if (!tokenExists) {
        throw new BadRequestException({
          success: false,
          message: 'Invalid or expired link. Please request a new one.',
        });
      }

      if (new Date() > new Date(tokenExists.expires_at)) {
        await tokenExists.destroy();
        throw new BadRequestException({
          success: false,
          message: 'This link is expired. Please request a new one.',
        });
      }

      return {
        success: true,
        message: 'Token is verified.',
        data: { user_id: tokenExists.user_id },
      };
    } catch (error) {
      if (error instanceof BadRequestException) throw error;
      throw new BadRequestException({
        success: false,
        message: (error as Error).message || AllMessages.SMTHG_WRNG,
      });
    }
  }

  async resetPassword(body: { token: string; password: string }) {
    try {
      const { token, password } = body;

      const tokenExists = await this.userRepo.userForgotTokenModel.findOne({
        where: { token },
      });

      if (!tokenExists) {
        throw new BadRequestException({
          success: false,
          message: 'Invalid or expired link. Please request a new one.',
        });
      }

      if (new Date() > new Date(tokenExists.expires_at)) {
        await tokenExists.destroy();
        throw new BadRequestException({
          success: false,
          message: 'This link is expired. Please request a new one.',
        });
      }

      const newPass = hashPasswordMD5(password);

      await this.userRepo.userModel.update({ password: newPass }, { where: { id: tokenExists.user_id } });
      await tokenExists.destroy();

      return {
        success: true,
        message: 'Your password has been successfully reset.',
      };
    } catch (error) {
      if (error instanceof BadRequestException) throw error;
      throw new BadRequestException({
        success: false,
        message: (error as Error).message || AllMessages.SMTHG_WRNG,
      });
    }
  }
}
