import { google } from 'googleapis';
import { EmailTemplate, EmailTemplateWithAttachment, EmailAttachment } from '@/types';

export class GmailService {
  private clientId: string;
  private clientSecret: string;

  constructor() {
    // Use the same OAuth client as NextAuth
    this.clientId = process.env.GOOGLE_CLIENT_ID!;
    this.clientSecret = process.env.GOOGLE_CLIENT_SECRET!;

    if (!this.clientId || !this.clientSecret) {
      throw new Error('Google OAuth credentials not configured');
    }
  }

  /**
   * Send email using user's refresh token from their session
   * @param emailData Email content and recipient
   * @param refreshToken User's OAuth refresh token from NextAuth session
   */
  async sendEmail(emailData: EmailTemplate, refreshToken: string): Promise<boolean> {
    try {
      // Create OAuth2 client with user's refresh token
      const auth = new google.auth.OAuth2(
        this.clientId,
        this.clientSecret,
        `${process.env.NEXTAUTH_URL}/api/auth/callback/google`
      );

      auth.setCredentials({
        refresh_token: refreshToken,
      });

      const gmail = google.gmail({ version: 'v1', auth });
      const message = this.createMessage(emailData);

      await gmail.users.messages.send({
        userId: 'me',
        requestBody: {
          raw: message,
        },
      });

      console.log('Email sent successfully to:', emailData.to);
      return true;
    } catch (error) {
      console.error('Error sending email:', error);
      return false;
    }
  }

  private createMessage(emailData: EmailTemplate): string {
    const message = [
      'Content-Type: text/html; charset=utf-8',
      'MIME-Version: 1.0',
      `To: ${emailData.to}`,
      `Subject: ${emailData.subject}`,
      '',
      emailData.html,
    ].join('\n');

    return Buffer.from(message)
      .toString('base64')
      .replace(/\+/g, '-')
      .replace(/\//g, '_')
      .replace(/=+$/, '');
  }

  /**
   * Send email with attachments using user's refresh token
   * @param emailData Email content, recipient, and attachments
   * @param refreshToken User's OAuth refresh token from NextAuth session
   */
  async sendEmailWithAttachment(
    emailData: EmailTemplateWithAttachment,
    refreshToken: string
  ): Promise<boolean> {
    try {
      // Create OAuth2 client with user's refresh token
      const auth = new google.auth.OAuth2(
        this.clientId,
        this.clientSecret,
        `${process.env.NEXTAUTH_URL}/api/auth/callback/google`
      );

      auth.setCredentials({
        refresh_token: refreshToken,
      });

      const gmail = google.gmail({ version: 'v1', auth });
      const message = this.createMessageWithAttachment(emailData);

      await gmail.users.messages.send({
        userId: 'me',
        requestBody: {
          raw: message,
        },
      });

      console.log('Email with attachment sent successfully to:', emailData.to);
      return true;
    } catch (error) {
      console.error('Error sending email with attachment:', error);
      return false;
    }
  }

  private createMessageWithAttachment(emailData: EmailTemplateWithAttachment): string {
    const boundary = `boundary_${Date.now()}_${Math.random().toString(36).substring(7)}`;

    // Encode subject for UTF-8 support
    const encodedSubject = `=?UTF-8?B?${Buffer.from(emailData.subject).toString('base64')}?=`;

    // Build MIME multipart message
    const messageParts: string[] = [
      'MIME-Version: 1.0',
      `To: ${emailData.to}`,
      `Subject: ${encodedSubject}`,
      `Content-Type: multipart/mixed; boundary="${boundary}"`,
      '',
      `--${boundary}`,
      'Content-Type: text/html; charset=utf-8',
      'Content-Transfer-Encoding: base64',
      '',
      Buffer.from(emailData.html).toString('base64'),
    ];

    // Add attachments
    if (emailData.attachments && emailData.attachments.length > 0) {
      for (const attachment of emailData.attachments) {
        // Encode filename for UTF-8 support
        const encodedFilename = `=?UTF-8?B?${Buffer.from(attachment.filename).toString('base64')}?=`;

        messageParts.push(
          `--${boundary}`,
          `Content-Type: ${attachment.contentType}; name="${encodedFilename}"`,
          'Content-Transfer-Encoding: base64',
          `Content-Disposition: attachment; filename="${encodedFilename}"`,
          '',
          attachment.content.toString('base64')
        );
      }
    }

    // Close boundary
    messageParts.push(`--${boundary}--`);

    const message = messageParts.join('\r\n');

    // Encode entire message for Gmail API (URL-safe base64)
    return Buffer.from(message)
      .toString('base64')
      .replace(/\+/g, '-')
      .replace(/\//g, '_')
      .replace(/=+$/, '');
  }
}

export const gmailService = new GmailService();
