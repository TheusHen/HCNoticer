import { config } from './config';
import { NewEventsResult } from './types';
import { buildEmailHtml, buildEmailSubject } from './email-template';
import { log } from './logger';

interface MailerSendRecipient {
  email: string;
  name?: string;
}

interface MailerSendPayload {
  from: { email: string; name: string };
  to: MailerSendRecipient[];
  subject: string;
  html: string;
}

export async function sendNotification(results: NewEventsResult[]): Promise<boolean> {
  if (results.length === 0) return false;
  if (!config.mailersend.apiKey) {
    log.warn('MAILERSEND_API_KEY not configured — skipping email');
    return false;
  }
  if (!config.email.fromEmail) {
    log.warn('EMAIL_FROM_EMAIL not configured — skipping email');
    return false;
  }
  if (config.email.to.length === 0) {
    log.warn('No email recipients configured — skipping email');
    return false;
  }

  const payload: MailerSendPayload = {
    from: {
      email: config.email.fromEmail,
      name: config.email.fromName,
    },
    to: config.email.to.map(email => ({ email })),
    subject: buildEmailSubject(results),
    html: buildEmailHtml(results),
  };

  try {
    const res = await fetch('https://api.mailersend.com/v1/email', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${config.mailersend.apiKey}`,
      },
      body: JSON.stringify(payload),
    });

    if (res.status === 202 || res.status === 200) {
      const messageId = res.headers.get('x-message-id') || 'accepted';
      log.success(`Email sent via MailerSend: ${messageId}`);
      return true;
    }

    const body = await res.text();
    log.error(`MailerSend API error (${res.status}): ${body}`);
    return false;
  } catch (err) {
    log.error(`Failed to send email: ${(err as Error).message}`);
    return false;
  }
}
