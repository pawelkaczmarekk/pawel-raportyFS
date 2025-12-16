import { google } from 'googleapis';
import { createMimeMessage, Mailbox } from 'mimetext';
import { EmailTemplate, EmailTemplateWithAttachment } from '@/types';

export class GmailService {
  private clientId: string;
  private clientSecret: string;

  constructor() {
    this.clientId = process.env.GOOGLE_CLIENT_ID!;
    this.clientSecret = process.env.GOOGLE_CLIENT_SECRET!;

    if (!this.clientId || !this.clientSecret) {
      throw new Error('Google OAuth credentials not configured');
    }
  }

  async sendEmail(emailData: EmailTemplate, refreshToken: string): Promise<boolean> {
    console.log('[Gmail] Sending email with subject:', emailData.subject);

    try {
      const auth = new google.auth.OAuth2(
        this.clientId,
        this.clientSecret,
        `${process.env.NEXTAUTH_URL}/api/auth/callback/google`
      );

      auth.setCredentials({
        refresh_token: refreshToken,
      });

      const gmail = google.gmail({ version: 'v1', auth });

      // Use mimetext for proper MIME encoding (handles UTF-8 subjects correctly)
      const msg = createMimeMessage();
      msg.setSender(emailData.to); // Gmail will override with authenticated user
      msg.setRecipient(emailData.to);
      msg.setSubject(emailData.subject);
      msg.addMessage({
        contentType: 'text/html',
        data: emailData.html,
      });

      // Use asRaw() + standard base64 (NOT asEncoded() which returns base64url)
      const raw = Buffer.from(msg.asRaw()).toString('base64');

      await gmail.users.messages.send({
        userId: 'me',
        requestBody: {
          raw: raw,
        },
      });

      console.log('Email sent successfully to:', emailData.to);
      return true;
    } catch (error) {
      console.error('Error sending email:', error);
      return false;
    }
  }

  async sendEmailWithAttachment(
    emailData: EmailTemplateWithAttachment,
    refreshToken: string
  ): Promise<boolean> {
    console.log('[Gmail] Sending email with attachment, subject:', emailData.subject);

    try {
      const auth = new google.auth.OAuth2(
        this.clientId,
        this.clientSecret,
        `${process.env.NEXTAUTH_URL}/api/auth/callback/google`
      );

      auth.setCredentials({
        refresh_token: refreshToken,
      });

      const gmail = google.gmail({ version: 'v1', auth });

      // Use mimetext for proper MIME encoding
      const msg = createMimeMessage();
      msg.setSender(emailData.to); // Gmail will override with authenticated user
      msg.setRecipient(emailData.to);
      msg.setSubject(emailData.subject);
      msg.addMessage({
        contentType: 'text/html',
        data: emailData.html,
      });

      // Add attachments
      if (emailData.attachments && emailData.attachments.length > 0) {
        for (const attachment of emailData.attachments) {
          msg.addAttachment({
            filename: attachment.filename,
            contentType: attachment.contentType,
            data: attachment.content.toString('base64'),
            encoding: 'base64',
          });
        }
      }

      // Use asRaw() + standard base64 (NOT asEncoded() which returns base64url)
      const raw = Buffer.from(msg.asRaw()).toString('base64');

      await gmail.users.messages.send({
        userId: 'me',
        requestBody: {
          raw: raw,
        },
      });

      console.log('Email with attachment sent successfully to:', emailData.to);
      return true;
    } catch (error) {
      console.error('Error sending email with attachment:', error);
      return false;
    }
  }
}

export const gmailService = new GmailService();
