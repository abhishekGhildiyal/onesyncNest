import { Injectable, Logger } from '@nestjs/common';
import { MailerService } from '@nestjs-modules/mailer';
import { Templates } from 'src/common/constants/mailTemplates';

@Injectable()
export class MailService {
  private readonly logger = new Logger(MailService.name);

  constructor(private readonly mailerService: MailerService) {}

  async sendMail(to: string, html: string, subject: string, attachments: any[] = []) {
    try {
      await this.mailerService.sendMail({
        to,
        subject,
        html,
        attachments,
      });
      this.logger.log(`📨📤 Mail sent to: ${to} 📤📨`);
      return { success: true, to };
    } catch (error) {
      this.logger.error(`Error sending mail to ${to}: ${error.message}`);
      return { success: false, to, error: error.message };
    }
  }

  getPopulatedTemplate(slug: string, variables: any = {}) {
    const template = Templates.find((t) => t.slug === slug);
    if (!template) throw new Error(`Template not found: ${slug}`);

    let html = template.html;
    for (const key in variables) {
      html = html.replace(new RegExp(`{{${key}}}`, 'g'), variables[key]);
    }

    return {
      html,
      subject: template.subject,
    };
  }

  async sendOrderReviewEmail(data: { to: string; orderNumber: string; storeName: string; customerName: string }) {
    try {
      const { to, orderNumber, storeName, customerName } = data;
      const html = `
        <h2>Order Under Review</h2>
        <p>Dear ${customerName},</p>
        <p>Your order <strong>${orderNumber}</strong> from ${storeName} has been marked for review.</p>
        <p>We will notify you once the review is complete.</p>
        <p>Thank you for your patience!</p>
      `;
      await this.sendMail(to, html, `Order ${orderNumber} - Under Review`);
      return { success: true };
    } catch (error) {
      this.logger.error(`Failed to send review email: ${error.message}`);
      return { success: false, error: error.message };
    }
  }

  async sendOrderConfirmationEmail(data: { to: string; orderNumber: string; storeName: string; customerName: string }) {
    try {
      const { to, orderNumber, storeName, customerName } = data;
      const html = `
        <h2>Order Confirmed!</h2>
        <p>Dear ${customerName},</p>
        <p>Great news! Your order <strong>${orderNumber}</strong> from ${storeName} has been confirmed.</p>
        <p>Your order is now in progress and will be processed shortly.</p>
        <p>Thank you for your business!</p>
      `;
      await this.sendMail(to, html, `Order ${orderNumber} - Confirmed`);
      return { success: true };
    } catch (error) {
      this.logger.error(`Failed to send confirmation email: ${error.message}`);
      return { success: false, error: error.message };
    }
  }
}
