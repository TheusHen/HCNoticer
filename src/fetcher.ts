import * as https from 'https';
import * as http from 'http';
import { YSWSData } from './types';
import { config } from './config';

export async function fetchYSWSData(): Promise<YSWSData> {
  const url = config.apiUrl;
  const getter = url.startsWith('https') ? https : http;

  return new Promise((resolve, reject) => {
    const request = getter.get(url, (res) => {
      if (res.statusCode && res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
        // Follow redirect
        const redirectUrl = res.headers.location;
        const redirectGetter = redirectUrl.startsWith('https') ? https : http;
        redirectGetter.get(redirectUrl, (rRes) => {
          handleResponse(rRes, resolve, reject);
        }).on('error', reject);
        return;
      }
      handleResponse(res, resolve, reject);
    });
    request.on('error', reject);
  });
}

function handleResponse(
  res: http.IncomingMessage,
  resolve: (data: YSWSData) => void,
  reject: (err: Error) => void
): void {
  if (res.statusCode !== 200) {
    reject(new Error(`HTTP ${res.statusCode} fetching YSWS data`));
    res.resume();
    return;
  }

  const chunks: Buffer[] = [];
  res.on('data', (chunk: Buffer) => chunks.push(chunk));
  res.on('end', () => {
    try {
      const raw = Buffer.concat(chunks).toString('utf-8');
      const data: YSWSData = JSON.parse(raw);
      resolve(data);
    } catch (err) {
      reject(new Error(`Failed to parse YSWS JSON: ${(err as Error).message}`));
    }
  });
  res.on('error', reject);
}
