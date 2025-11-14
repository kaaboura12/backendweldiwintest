import { Injectable, Logger } from '@nestjs/common';
import twilio, { Twilio } from 'twilio';

@Injectable()
export class SmsService {
  private readonly logger = new Logger(SmsService.name);
  private client: Twilio | null = null;

  private ensureClient(): Twilio | null {
    if (this.client) return this.client;
    const sid = process.env.TWILIO_ACCOUNT_SID;
    const token = process.env.TWILIO_AUTH_TOKEN;
    if (!sid || !token) {
      this.logger.warn('Twilio is not configured; SMS will be logged only');
      return (this.client = null);
    }
    this.client = twilio(sid, token);
    return this.client;
  }

  async send(to: string, body: string): Promise<void> {
    const from = process.env.TWILIO_FROM_NUMBER;
    const client = this.ensureClient();
    if (!client || !from) {
      this.logger.log(`[DEV-SMS] To: ${to} | ${body}`);
      return;
    }
    await client.messages.create({ from, to, body });
  }
}


