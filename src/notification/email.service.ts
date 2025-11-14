import { Injectable, Logger } from '@nestjs/common';
import nodemailer, { Transporter } from 'nodemailer';

@Injectable()
export class EmailService {
  private readonly logger = new Logger(EmailService.name);
  private transporter: Transporter | null = null;

  private ensureTransporter(): Transporter {
    if (this.transporter) return this.transporter;
    const host = process.env.SMTP_HOST;
    const port = parseInt(process.env.SMTP_PORT || '587', 10);
    const secure = (process.env.SMTP_SECURE || 'false') === 'true';
    const user = process.env.SMTP_USER;
    const pass = process.env.SMTP_PASS;

    if (!host || !user || !pass) {
      this.logger.warn('SMTP credentials are not fully configured; emails will be logged only');
      return (this.transporter = null);
    }

    this.transporter = nodemailer.createTransport({ host, port, secure, auth: { user, pass } });
    return this.transporter;
  }

  async send(to: string, subject: string, html: string): Promise<void> {
    const from = process.env.SMTP_FROM || 'no-reply@weldiwin.app';
    const transporter = this.ensureTransporter();
    if (!transporter) {
      this.logger.log(`[DEV-EMAIL] To: ${to} | Subject: ${subject}\n${html}`);
      return;
    }
    await transporter.sendMail({ from, to, subject, html });
  }
}


