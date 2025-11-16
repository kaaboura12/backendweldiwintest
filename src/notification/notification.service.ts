import { Injectable, Logger } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { EmailService } from './email.service';
import { SmsService } from './sms.service';
import { User, UserDocument } from '../user/schemas/user.schema';
import { Child } from '../child/schemas/child.schema';
import { DangerZone } from '../danger-zone/schemas/danger-zone.schema';
import { DangerZoneEventType } from '../danger-zone/schemas/danger-zone-event.schema';

export interface DangerZoneNotificationData {
  child: Child;
  dangerZone: DangerZone;
  eventType: DangerZoneEventType;
  location: { lat: number; lng: number };
}

@Injectable()
export class NotificationService {
  private readonly logger = new Logger(NotificationService.name);

  constructor(
    private readonly emailService: EmailService,
    private readonly smsService: SmsService,
    @InjectModel(User.name) private userModel: Model<UserDocument>,
  ) {}

  /**
   * Send danger zone alert to parent
   */
  async sendDangerZoneAlert(parentId: string, data: DangerZoneNotificationData): Promise<void> {
    const parent = await this.userModel.findById(parentId).exec();
    
    if (!parent) {
      this.logger.warn(`Parent ${parentId} not found for danger zone notification`);
      return;
    }

    const { child, dangerZone, eventType, location } = data;
    const action = eventType === DangerZoneEventType.ENTER ? 'entered' : 'exited';
    
    const subject = `⚠️ Alert: ${child.firstName} ${action} danger zone "${dangerZone.name}"`;
    const message = this.buildDangerZoneMessage(child, dangerZone, eventType, location);

    // Send email notification
    if (parent.email) {
      try {
        const htmlMessage = this.buildDangerZoneEmailHtml(child, dangerZone, eventType, location);
        await this.emailService.send(parent.email, subject, htmlMessage);
        this.logger.log(`Email notification sent to ${parent.email} for ${child.firstName}`);
      } catch (error) {
        this.logger.error(`Failed to send email to ${parent.email}:`, error);
      }
    }

    // Send SMS notification if phone number is available
    if (parent.phoneNumber) {
      try {
        await this.smsService.send(parent.phoneNumber, message);
        this.logger.log(`SMS notification sent to ${parent.phoneNumber} for ${child.firstName}`);
      } catch (error) {
        this.logger.error(`Failed to send SMS to ${parent.phoneNumber}:`, error);
      }
    }

    // If no contact methods available, just log
    if (!parent.email && !parent.phoneNumber) {
      this.logger.warn(`No email or phone for parent ${parentId}, notification not sent`);
    }
  }

  /**
   * Build plain text message for danger zone alert
   */
  private buildDangerZoneMessage(
    child: Child,
    dangerZone: DangerZone,
    eventType: DangerZoneEventType,
    location: { lat: number; lng: number }
  ): string {
    const action = eventType === DangerZoneEventType.ENTER ? 'entered' : 'exited';
    const timestamp = new Date().toLocaleString();
    
    return `WELDIWIN ALERT: Your child ${child.firstName} ${child.lastName} has ${action} the danger zone "${dangerZone.name}" at ${timestamp}. Location: ${location.lat.toFixed(6)}, ${location.lng.toFixed(6)}`;
  }

  /**
   * Build HTML email for danger zone alert
   */
  private buildDangerZoneEmailHtml(
    child: Child,
    dangerZone: DangerZone,
    eventType: DangerZoneEventType,
    location: { lat: number; lng: number }
  ): string {
    const action = eventType === DangerZoneEventType.ENTER ? 'entered' : 'exited';
    const actionColor = eventType === DangerZoneEventType.ENTER ? '#dc3545' : '#28a745';
    const timestamp = new Date().toLocaleString();
    const mapsUrl = `https://www.google.com/maps?q=${location.lat},${location.lng}`;

    return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
</head>
<body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
  <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0;">
    <h1 style="margin: 0; font-size: 28px;">⚠️ Weldiwin Alert</h1>
  </div>
  
  <div style="background-color: #f8f9fa; padding: 30px; border-radius: 0 0 10px 10px; box-shadow: 0 4px 6px rgba(0,0,0,0.1);">
    <div style="background-color: ${actionColor}; color: white; padding: 15px; border-radius: 8px; margin-bottom: 20px; text-align: center;">
      <h2 style="margin: 0; font-size: 22px;">Child ${action.toUpperCase()} Danger Zone</h2>
    </div>
    
    <div style="background-color: white; padding: 20px; border-radius: 8px; margin-bottom: 15px;">
      <h3 style="color: #667eea; margin-top: 0; border-bottom: 2px solid #667eea; padding-bottom: 10px;">Details</h3>
      <p><strong>Child:</strong> ${child.firstName} ${child.lastName}</p>
      <p><strong>Danger Zone:</strong> ${dangerZone.name}</p>
      ${dangerZone.description ? `<p><strong>Description:</strong> ${dangerZone.description}</p>` : ''}
      <p><strong>Action:</strong> <span style="color: ${actionColor}; font-weight: bold;">${action.toUpperCase()}</span></p>
      <p><strong>Time:</strong> ${timestamp}</p>
    </div>

    <div style="background-color: white; padding: 20px; border-radius: 8px; margin-bottom: 15px;">
      <h3 style="color: #667eea; margin-top: 0; border-bottom: 2px solid #667eea; padding-bottom: 10px;">Location</h3>
      <p><strong>Coordinates:</strong> ${location.lat.toFixed(6)}, ${location.lng.toFixed(6)}</p>
      <p><strong>Zone Center:</strong> ${dangerZone.center.lat.toFixed(6)}, ${dangerZone.center.lng.toFixed(6)}</p>
      <p><strong>Zone Radius:</strong> ${dangerZone.radiusMeters}m</p>
      <div style="text-align: center; margin-top: 15px;">
        <a href="${mapsUrl}" style="display: inline-block; background-color: #667eea; color: white; padding: 12px 30px; text-decoration: none; border-radius: 5px; font-weight: bold;">View on Google Maps</a>
      </div>
    </div>

    <div style="background-color: #fff3cd; border-left: 4px solid #ffc107; padding: 15px; border-radius: 5px; margin-top: 20px;">
      <p style="margin: 0; font-size: 14px; color: #856404;">
        <strong>Note:</strong> This is an automated alert from Weldiwin. Please check on your child if necessary.
      </p>
    </div>
  </div>

  <div style="text-align: center; margin-top: 20px; color: #6c757d; font-size: 12px;">
    <p>© ${new Date().getFullYear()} Weldiwin. All rights reserved.</p>
    <p>This is an automated message. Please do not reply to this email.</p>
  </div>
</body>
</html>
    `.trim();
  }

  /**
   * Send general notification email
   */
  async sendEmail(to: string, subject: string, html: string): Promise<void> {
    try {
      await this.emailService.send(to, subject, html);
      this.logger.log(`Email sent to ${to}`);
    } catch (error) {
      this.logger.error(`Failed to send email to ${to}:`, error);
      throw error;
    }
  }

  /**
   * Send general SMS
   */
  async sendSms(to: string, message: string): Promise<void> {
    try {
      await this.smsService.send(to, message);
      this.logger.log(`SMS sent to ${to}`);
    } catch (error) {
      this.logger.error(`Failed to send SMS to ${to}:`, error);
      throw error;
    }
  }
}

