import * as dotenv from 'dotenv';
import * as path from 'path';

dotenv.config();

export const config = {
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
