import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import sgMail from '@sendgrid/mail';
import { Templates } from 'src/common/constants/mailTemplates';
import { StoreRepository } from 'src/db/repository/store.repository';

export interface SendGridAttachment {
  content: string;
  filename: string;
  type?: string;
  disposition?: string;
}

@Injectable()
export class MailService {
  private readonly logger = new Logger(MailService.name);

  constructor(
    private readonly storeRepo: StoreRepository,
    private readonly config: ConfigService,
  ) {}

  /**
   * Send email via SendGrid — mirrors Express `utils/nodemailer_sendgrid.js`.
   * Uses per-store API key/from when storeId is provided, else env fallbacks.
   */
  async sendMail(
    to: string,
    html: string,
    subject: string,
    storeId: number | string = '',
    attachments: SendGridAttachment[] = [],
  ): Promise<{ success: boolean; to?: string; error?: string }> {
    try {
      let store: { sendgridApiKey?: string; sendgridFromEmail?: string; store_name?: string } | null =
        null;

      if (storeId !== '' && storeId != null) {
        store = await this.storeRepo.storeModel.findOne({
          where: { store_id: storeId },
          attributes: ['sendgridApiKey', 'sendgridFromEmail', 'store_name'],
        });

        if (!store) {
          throw new Error(`Store not found with id: ${storeId}`);
        }
      }

      const apiKey =
        store?.sendgridApiKey || this.config.get<string>('SENDGRID_API_KEY') || process.env.SENDGRID_API_KEY;

      if (!apiKey) {
        throw new Error('SendGrid API key is missing (DB & ENV both empty).');
      }

      sgMail.setApiKey(apiKey);

      const fromEmail =
        store?.sendgridFromEmail ||
        this.config.get<string>('SENDGRID_FROM') ||
        process.env.SENDGRID_FROM;

      const fromName =
        store?.store_name ||
        this.config.get<string>('PROJECT_NAME') ||
        process.env.PROJECT_NAME ||
        'OneSync';

      const msg = {
        to,
        from: {
          email: fromEmail!,
          name: fromName,
        },
        subject,
        html,
        attachments: attachments.map((att) => ({
          content: att.content,
          filename: att.filename,
          type: att.type || 'application/octet-stream',
          disposition: att.disposition || 'attachment',
        })),
      };

      await sgMail.send(msg);
      this.logger.log(`📨📤 Mail sent to: ${to} 📤📨`);
      return { success: true, to };
    } catch (error: any) {
      const detail = error?.response?.body || error?.message;
      this.logger.error(`SendGrid error for ${to}: ${JSON.stringify(detail)}`);
      return { success: false, to, error: error?.message || 'SendGrid send failed' };
    }
  }

  replaceVariablesInTemplate(template: string, variables: Record<string, string>) {
    try {
      let result = template;
      for (const key in variables) {
        result = result.replace(new RegExp(key, 'g'), variables[key]);
      }
      return result;
    } catch {
      return '';
    }
  }

  getPopulatedTemplate(slug: string, variables: Record<string, string | undefined> = {}) {
    const template = Templates.find((t) => t.slug === slug);
    if (!template) throw new Error(`Template not found: ${slug}`);

    let html = template.html;
    for (const key in variables) {
      html = html.replace(new RegExp(`{{${key}}}`, 'g'), String(variables[key] ?? ''));
    }

    return {
      html,
      subject: template.subject,
    };
  }

  async sendOrderReviewEmail(data: {
    to: string;
    orderNumber: string;
    storeName: string;
    customerName: string;
    storeId?: number | string;
  }) {
    try {
      const { to, orderNumber, storeName, customerName, storeId } = data;
      const html = `
        <h2>Order Under Review</h2>
        <p>Dear ${customerName},</p>
        <p>Your order <strong>${orderNumber}</strong> from ${storeName} has been marked for review.</p>
        <p>We will notify you once the review is complete.</p>
        <p>Thank you for your patience!</p>
      `;
      return this.sendMail(to, html, `Order ${orderNumber} - Under Review`, storeId ?? '');
    } catch (error: any) {
      this.logger.error(`Failed to send review email: ${error.message}`);
      return { success: false, error: error.message };
    }
  }

  async sendOrderConfirmationEmail(data: {
    to: string;
    orderNumber: string;
    storeName: string;
    customerName: string;
    storeId?: number | string;
  }) {
    try {
      const { to, orderNumber, storeName, customerName, storeId } = data;
      const html = `
        <h2>Order Confirmed!</h2>
        <p>Dear ${customerName},</p>
        <p>Great news! Your order <strong>${orderNumber}</strong> from ${storeName} has been confirmed.</p>
        <p>Your order is now in progress and will be processed shortly.</p>
        <p>Thank you for your business!</p>
      `;
      return this.sendMail(to, html, `Order ${orderNumber} - Confirmed`, storeId ?? '');
    } catch (error: any) {
      this.logger.error(`Failed to send confirmation email: ${error.message}`);
      return { success: false, error: error.message };
    }
  }
}
