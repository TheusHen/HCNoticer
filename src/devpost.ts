import * as https from 'https';
import * as http from 'http';
import { YSWSEvent, DevpostRawHackathon, DevpostApiResponse } from './types';
import { config } from './config';

function getJson(url: string): Promise<any> {
  const getter = url.startsWith('https') ? https : http;
  return new Promise((resolve, reject) => {
    const request = getter.get(
      url,
      {
        headers: {
          Accept: 'application/json',
          'User-Agent': 'HCNoticer/1.0 (+https://github.com/TheusHen/HCNoticer)',
        },
      },
      (res) => {
        if (res.statusCode && res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
          getJson(res.headers.location as string).then(resolve, reject);
          return;
        }
        if (res.statusCode !== 200) {
          reject(new Error(`HTTP ${res.statusCode} fetching Devpost data`));
          res.resume();
          return;
        }
        const chunks: Buffer[] = [];
        res.on('data', (chunk: Buffer) => chunks.push(chunk));
        res.on('end', () => {
          try {
            resolve(JSON.parse(Buffer.concat(chunks).toString('utf-8')));
          } catch (err) {
            reject(new Error(`Failed to parse Devpost JSON: ${(err as Error).message}`));
          }
        });
        res.on('error', reject);
      }
    );
    request.on('error', reject);
  });
}

function stripTags(html: string): string {
  return html.replace(/<[^>]*>/g, '').trim();
}

/** "Jul 31 - Oct 01, 2026" -> ISO of "Oct 01, 2026"; null if unparseable. */
export function parseDevpostDeadline(dates: string | undefined): string | undefined {
  if (!dates) return undefined;
  const parts = dates.split(' - ');
  const endPart = parts[parts.length - 1]?.trim();
  if (!endPart) return undefined;
  const d = new Date(endPart);
  if (isNaN(d.getTime())) return undefined;
  return d.toISOString();
}

export function isDevpostOnline(h: DevpostRawHackathon): boolean {
  const loc = (h.displayed_location?.location || '').trim().toLowerCase();
  if (loc === 'online') return true;
  if (h.displayed_location?.icon === 'globe') return true;
  return false;
}

export function isDevpostOpen(h: DevpostRawHackathon): boolean {
  return (h.open_state || '').toLowerCase() === 'open';
}

export function normalizeDevpost(h: DevpostRawHackathon): YSWSEvent {
  const themes = (h.themes || []).map(t => t.name).filter(Boolean);
  const prize = h.prize_amount ? stripTags(h.prize_amount) : '';
  const deadline = parseDevpostDeadline(h.submission_period_dates);

  const descBits: string[] = [];
  if (h.organization_name) descBits.push(`by ${h.organization_name}`);
  if (h.submission_period_dates) descBits.push(h.submission_period_dates);
  if (typeof h.registrations_count === 'number') descBits.push(`${h.registrations_count} participants`);
  if (themes.length) descBits.push(`Themes: ${themes.join(', ')}`);
  if (prize) descBits.push(`Prize: ${prize}`);
  if (h.time_left_to_submission) descBits.push(h.time_left_to_submission);

  return {
    name: h.title,
    description: descBits.join(' · ') || h.title,
    website: h.url,
    status: 'active',
    deadline,
    participants: h.registrations_count,
    source: 'devpost',
    url: h.url,
    location: h.displayed_location?.location || 'Online',
    themes,
    prize,
    registrations: h.registrations_count,
    submissionDates: h.submission_period_dates,
    timeLeft: h.time_left_to_submission,
    organization: h.organization_name,
    externalId: String(h.id),
  };
}

/**
 * Fetches Devpost hackathons (public API, no auth), paginates up to
 * config.devpost.maxPages and keeps only online + open (client-side
 * filter — server params are unreliable).
 */
export async function fetchDevpostHackathons(): Promise<YSWSEvent[]> {
  const base = config.devpost.apiUrl.replace(/\/$/, '');
  const maxPages = Math.max(1, config.devpost.maxPages);
  const search = config.devpost.search.trim().toLowerCase();

  const collected: DevpostRawHackathon[] = [];
  for (let page = 1; page <= maxPages; page++) {
    const url = `${base}?page=${page}`;
    let data: DevpostApiResponse;
    try {
      data = (await getJson(url)) as DevpostApiResponse;
    } catch (err) {
      if (page === 1) throw err;
      break; // later pages failing shouldn't kill earlier results
    }
    const list = data?.hackathons || [];
    if (list.length === 0) break;
    collected.push(...list);
    const perPage = data?.meta?.per_page || list.length;
    if (list.length < perPage) break;
  }

  let filtered = collected.filter(h => !h.invite_only && isDevpostOnline(h) && isDevpostOpen(h));

  if (search) {
    filtered = filtered.filter(h => {
      const hay = `${h.title} ${(h.organization_name || '')} ${(h.themes || []).map(t => t.name).join(' ')}`.toLowerCase();
      return hay.includes(search);
    });
  }

  // Dedupe by id
  const seen = new Set<number>();
  const events: YSWSEvent[] = [];
  for (const h of filtered) {
    if (seen.has(h.id)) continue;
    seen.add(h.id);
    events.push(normalizeDevpost(h));
  }
  return events;
}
