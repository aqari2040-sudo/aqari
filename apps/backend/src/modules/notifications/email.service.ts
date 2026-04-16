import { Injectable, Logger } from '@nestjs/common';

@Injectable()
export class EmailService {
  private readonly logger = new Logger(EmailService.name);

  async sendEmail(params: {
    to: string;
    subject: string;
    html: string;
  }): Promise<void> {
    // TODO: Integrate with Resend API
    // const resend = new Resend(process.env.RESEND_API_KEY);
    // await resend.emails.send({
    //   from: process.env.RESEND_FROM_EMAIL,
    //   to: params.to,
    //   subject: params.subject,
    //   html: params.html,
    // });
    this.logger.log(`[EMAIL STUB] To: ${params.to}, Subject: ${params.subject}`);
  }

  async sendNotificationEmail(notification: {
    email: string;
    title: string;
    body: string;
  }): Promise<void> {
    await this.sendEmail({
      to: notification.email,
      subject: `Aqari: ${notification.title}`,
      html: `<div style="font-family: sans-serif; padding: 20px;">
        <h2 style="color: #2563EB;">Aqari</h2>
        <h3>${notification.title}</h3>
        <p>${notification.body}</p>
        <hr/>
        <p style="color: #6b7280; font-size: 12px;">This is an automated notification from Aqari Property Management.</p>
      </div>`,
    });
  }
}
