import { BaseNotificationChannel } from './BaseChannel.js';
import type { Notification, EmailConfig } from '../types.js';

/**
 * Канал email уведомлений
 *
 * Примечание: Для работы требуется установка nodemailer:
 * npm install nodemailer @types/nodemailer
 */
export class EmailChannel extends BaseNotificationChannel {
  private config: EmailConfig;

  constructor(config: EmailConfig) {
    super(config.enabled, config.minImportance);
    this.config = config;
  }

  get name(): string {
    return 'email';
  }

  async send(notification: Notification): Promise<void> {
    if (!this.config.smtp) {
      console.warn('SMTP configuration not provided');
      return;
    }

    try {
      // Подготовка содержимого письма
      const subject = `[${notification.importance.toUpperCase()}] ${notification.title}`;
      const html = this.formatEmailHtml(notification);
      const text = this.formatEmailText(notification);

      // Отправка через внешний SMTP или API
      // В production можно использовать nodemailer, SendGrid, Mailgun и т.д.

      // Для демонстрации используем простой HTTP запрос к API (например, SendGrid)
      if (process.env.SENDGRID_API_KEY) {
        await this.sendViaApi(subject, html, text);
      } else {
        // Fallback: вывод в консоль
        console.warn('Email service not configured. Would send email:');
        console.log('To:', this.config.recipients.join(', '));
        console.log('Subject:', subject);
        console.log('Body:', text);
      }
    } catch (error) {
      console.error('Failed to send email notification:', error);
      throw error;
    }
  }

  /**
   * Форматирование письма в HTML
   */
  private formatEmailHtml(notification: Notification): string {
    const emoji = this.getEmoji(notification.importance);
    const timestamp = this.formatDate(notification.timestamp);
    const symbol = notification.symbol ? `<strong>${notification.symbol}</strong>` : '';

    let html = `
<!DOCTYPE html>
<html>
<head>
  <style>
    body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
    .container { max-width: 600px; margin: 0 auto; padding: 20px; }
    .header { background-color: #f4f4f4; padding: 15px; border-radius: 5px; margin-bottom: 20px; }
    .title { font-size: 20px; font-weight: bold; margin-bottom: 10px; }
    .message { background-color: #fff; padding: 15px; border-left: 4px solid #4CAF50; margin-bottom: 20px; }
    .data { background-color: #f9f9f9; padding: 15px; border-radius: 5px; }
    .data-item { padding: 5px 0; }
    .footer { color: #666; font-size: 12px; margin-top: 20px; border-top: 1px solid #ddd; padding-top: 10px; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <div class="title">${emoji} ${symbol} ${notification.title}</div>
      <div style="color: #666; font-size: 14px;">${timestamp}</div>
    </div>

    <div class="message">
      ${notification.message}
    </div>
    `;

    if (notification.data) {
      html += '<div class="data"><strong>Details:</strong><br>';
      for (const [key, value] of Object.entries(notification.data)) {
        if (value === null || value === undefined) continue;
        const formattedKey = key.replace(/([A-Z])/g, ' $1').trim();
        const capitalizedKey = formattedKey.charAt(0).toUpperCase() + formattedKey.slice(1);
        html += `<div class="data-item"><strong>${capitalizedKey}:</strong> ${value}</div>`;
      }
      html += '</div>';
    }

    html += `
    <div class="footer">
      This is an automated notification from your Trading Bot<br>
      Category: ${notification.category} | Type: ${notification.type}
    </div>
  </div>
</body>
</html>`;

    return html;
  }

  /**
   * Форматирование письма в текстовом виде
   */
  private formatEmailText(notification: Notification): string {
    const emoji = this.getEmoji(notification.importance);
    const timestamp = this.formatDate(notification.timestamp);
    const symbol = notification.symbol ? `[${notification.symbol}]` : '';

    let text = `${emoji} ${symbol} ${notification.title}\n\n`;
    text += `${notification.message}\n\n`;
    text += `Time: ${timestamp}\n`;

    if (notification.data) {
      text += '\nDetails:\n';
      for (const [key, value] of Object.entries(notification.data)) {
        if (value === null || value === undefined) continue;
        const formattedKey = key.replace(/([A-Z])/g, ' $1').trim();
        const capitalizedKey = formattedKey.charAt(0).toUpperCase() + formattedKey.slice(1);
        text += `  ${capitalizedKey}: ${value}\n`;
      }
    }

    text += `\nCategory: ${notification.category} | Type: ${notification.type}\n`;

    return text;
  }

  /**
   * Отправка через внешний API (например, SendGrid)
   */
  private async sendViaApi(subject: string, html: string, text: string): Promise<void> {
    const apiKey = process.env.SENDGRID_API_KEY;
    if (!apiKey) {
      throw new Error('SENDGRID_API_KEY not configured');
    }

    try {
      const response = await fetch('https://api.sendgrid.com/v3/mail/send', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${apiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          personalizations: [
            {
              to: this.config.recipients.map((email) => ({ email })),
            },
          ],
          from: {
            email: this.config.smtp.from,
            name: 'Trading Bot',
          },
          subject,
          content: [
            {
              type: 'text/plain',
              value: text,
            },
            {
              type: 'text/html',
              value: html,
            },
          ],
        }),
      });

      if (!response.ok) {
        const error = await response.text();
        throw new Error(`SendGrid API error: ${error}`);
      }
    } catch (error) {
      console.error('Failed to send email via API:', error);
      throw error;
    }
  }

  /**
   * Альтернатива: отправка через SMTP с nodemailer
   * Раскомментируйте этот метод если используете nodemailer
   */
  /*
  private async sendViaSmtp(subject: string, html: string, text: string): Promise<void> {
    // Требуется: npm install nodemailer
    const nodemailer = await import('nodemailer');

    const transporter = nodemailer.createTransport({
      host: this.config.smtp.host,
      port: this.config.smtp.port,
      secure: this.config.smtp.secure,
      auth: {
        user: this.config.smtp.user,
        pass: this.config.smtp.password,
      },
    });

    await transporter.sendMail({
      from: this.config.smtp.from,
      to: this.config.recipients.join(', '),
      subject,
      text,
      html,
    });
  }
  */
}
