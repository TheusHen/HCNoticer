import * as dotenv from 'dotenv';
import * as path from 'path';

dotenv.config();

const intervalSeconds = Number(process.env.HCNOTICER_INTERVAL_SECONDS || '300');
const devpostMaxPages = Number(process.env.DEVPOST_MAX_PAGES || '5');
const maxPerSource = Number(process.env.EMAIL_MAX_PER_SOURCE || '10');

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
    maxPerSource: Number.isFinite(maxPerSource) && maxPerSource > 0 ? Math.floor(maxPerSource) : 10,
  },
  apiUrl:
    process.env.YSWS_API_URL ||
    'https://raw.githubusercontent.com/hackclub/YSWS-Catalog/main/api.json',
  devpost: {
    apiUrl: process.env.DEVPOST_API_URL || 'https://devpost.com/api/hackathons',
    maxPages: Number.isFinite(devpostMaxPages) && devpostMaxPages > 0 ? Math.floor(devpostMaxPages) : 5,
    search: process.env.DEVPOST_SEARCH || '',
  },
  stateFile: path.resolve(process.env.STATE_FILE || './data/state.json'),
};
