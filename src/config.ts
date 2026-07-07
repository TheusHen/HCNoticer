import * as dotenv from 'dotenv';
import * as path from 'path';

dotenv.config();

const intervalSeconds = Number(process.env.HCNOTICER_INTERVAL_SECONDS || '300');

export const config = {
  runtime: {
    intervalSeconds: Number.isFinite(intervalSeconds) ? intervalSeconds : 300,
  },
  mailersend: {
    apiKey: process.env.MAILERSEND_API_KEY || '',
  },
  email: {
    fromName: process.env.EMAIL_FROM_NAME || 'HCNoticer',
    fromEmail: process.env.EMAIL_FROM_EMAIL || '',
    to: (process.env.EMAIL_TO || '').split(',').map(s => s.trim()).filter(Boolean),
  },
  apiUrl:
    process.env.YSWS_API_URL ||
    'https://raw.githubusercontent.com/hackclub/YSWS-Catalog/main/api.json',
  stateFile: path.resolve(process.env.STATE_FILE || './data/state.json'),
};
