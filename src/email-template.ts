import { YSWSEvent, NewEventsResult, HackathonSource } from './types';
import {
  stripHtml,
  sanitizeSlackUrl,
  formatDeadline,
  isDeadlineSoon,
  isExpired,
  extractDeadlineFromHtml,
} from './sanitize';
import { config } from './config';

function esc(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

// Priority order: active first, draft middle, ended last
const STATUS_ORDER: Record<string, number> = { active: 0, draft: 1, ended: 2 };

function sortResults(results: NewEventsResult[]): NewEventsResult[] {
  return [...results].sort((a, b) => {
    const aMin = Math.min(...a.newEvents.map(e => STATUS_ORDER[e.status] ?? 1));
    const bMin = Math.min(...b.newEvents.map(e => STATUS_ORDER[e.status] ?? 1));
    return aMin - bMin;
  });
}

function eventsOf(results: NewEventsResult[], source: HackathonSource): YSWSEvent[] {
  const out: YSWSEvent[] = [];
  for (const r of results) {
    const src: HackathonSource = r.source || 'ysws';
    if (src !== source) continue;
    out.push(...r.newEvents);
  }
  return out;
}

function splitByStatus(events: YSWSEvent[]) {
  const active: YSWSEvent[] = [];
  const draft: YSWSEvent[] = [];
  const ended: YSWSEvent[] = [];

  for (const e of events) {
    if (e.status === 'active') active.push(e);
    else if (e.status === 'draft') draft.push(e);
    else ended.push(e);
  }
  return { active, draft, ended };
}

function deadlineTag(event: YSWSEvent): string {
  const dl = event.deadline || extractDeadlineFromHtml(event.description);
  if (!dl) return '';
  const formatted = formatDeadline(dl);
  if (isExpired(dl)) return `<span style="color:#dc2626;font-size:12px;"> &mdash; Expired</span>`;
  if (isDeadlineSoon(dl)) return `<span style="color:#d97706;font-size:12px;"> &mdash; ${esc(formatted)}</span>`;
  return `<span style="color:#6b7280;font-size:12px;"> &mdash; ${esc(formatted)}</span>`;
}

function renderActiveCard(e: YSWSEvent): string {
  const desc = stripHtml(e.description);
  const slackUrl = sanitizeSlackUrl(e.slack);
  const links: string[] = [];
  if (e.website) links.push(`<a href="${esc(e.website)}" style="color:#ec3750;text-decoration:none;font-size:13px;">Website</a>`);
  if (slackUrl) links.push(`<a href="${esc(slackUrl)}" style="color:#ec3750;text-decoration:none;font-size:13px;">${esc(e.slackChannel || 'Slack')}</a>`);

  return `<tr><td style="padding:10px 14px;border-bottom:1px solid #f0f0f0;">
<strong style="font-size:14px;color:#111;">${esc(e.name)}</strong>${deadlineTag(e)}<br>
<span style="font-size:13px;color:#555;">${esc(desc)}</span>
${links.length ? `<br><span style="font-size:12px;">${links.join(' &middot; ')}</span>` : ''}
</td></tr>`;
}

function renderDraftRow(e: YSWSEvent): string {
  const desc = stripHtml(e.description);
  return `<tr><td style="padding:6px 14px;border-bottom:1px solid #f5f5f5;">
<span style="font-size:13px;color:#333;"><strong>${esc(e.name)}</strong> &mdash; ${esc(desc)}</span>
</td></tr>`;
}

function renderEndedLine(e: YSWSEvent): string {
  return `${esc(e.name)}`;
}

function renderDevpostCard(e: YSWSEvent): string {
  const meta: string[] = [];
  if (e.organization) meta.push(esc(e.organization));
  if (e.submissionDates) meta.push(esc(e.submissionDates));
  if (typeof e.registrations === 'number') meta.push(`${e.registrations.toLocaleString('en-US')} participants`);
  if (e.prize) meta.push(`Prize: ${esc(e.prize)}`);
  if (e.timeLeft) meta.push(esc(e.timeLeft));
  if (e.themes?.length) meta.push(esc(e.themes.join(', ')));

  const link = e.url || e.website;
  return `<tr><td style="padding:10px 14px;border-bottom:1px solid #f0f0f0;">
<strong style="font-size:14px;color:#111;">${esc(e.name)}</strong>${deadlineTag(e)}<br>
${meta.length ? `<span style="font-size:12px;color:#555;">${meta.join(' &middot; ')}</span>` : ''}
${link ? `<br><a href="${esc(link)}" style="color:#2563eb;text-decoration:none;font-size:13px;">View on Devpost &rarr;</a>` : ''}
</td></tr>`;
}

function sectionHeader(title: string, count: number, color: { bg: string; border: string; text: string }): string {
  return `<tr><td style="padding:8px 14px;background:${color.bg};border-left:3px solid ${color.border};font-size:13px;font-weight:700;color:${color.text};text-transform:uppercase;letter-spacing:0.5px;">
${esc(title)} (${count})
</td></tr>`;
}

function moreNote(total: number, shown: number): string {
  if (total <= shown) return '';
  return `<tr><td style="padding:6px 14px;font-size:12px;color:#888;">+${total - shown} more (see terminal / next email)</td></tr>`;
}

export function buildEmailHtml(results: NewEventsResult[]): string {
  const limit = config.email.maxPerSource;
  const yswsEvents = eventsOf(results, 'ysws');
  const devpostEvents = eventsOf(results, 'devpost');
  const { active, draft, ended } = splitByStatus(yswsEvents);
  const totalNew = yswsEvents.length + devpostEvents.length;
  const now = new Date().toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });

  let body = '';

  // ── Section 1: HackClub YSWS (dedicated) ──
  if (yswsEvents.length > 0) {
    body += `
<table width="100%" cellpadding="0" cellspacing="0" style="margin-bottom:4px;">
<tr><td style="padding:12px 14px 4px;font-size:15px;font-weight:800;color:#111;">
HackClub YSWS (${yswsEvents.length})
</td></tr>
</table>`;
    const shownActive = active.slice(0, limit);
    const shownDraft = draft.slice(0, limit);
    if (shownActive.length > 0) {
      body += `
<table width="100%" cellpadding="0" cellspacing="0" style="margin-bottom:12px;">
${sectionHeader('Active', active.length, { bg: '#ecfdf5', border: '#22c55e', text: '#166534' })}
${shownActive.map(renderActiveCard).join('')}
${moreNote(active.length, shownActive.length)}
</table>`;
    }
    if (shownDraft.length > 0) {
      body += `
<table width="100%" cellpadding="0" cellspacing="0" style="margin-bottom:12px;">
${sectionHeader('Drafts', draft.length, { bg: '#fefce8', border: '#eab308', text: '#854d0e' })}
${shownDraft.map(renderDraftRow).join('')}
${moreNote(draft.length, shownDraft.length)}
</table>`;
    }
    if (ended.length > 0) {
      body += `
<table width="100%" cellpadding="0" cellspacing="0" style="margin-bottom:12px;">
${sectionHeader('Ended', ended.length, { bg: '#fef2f2', border: '#ef4444', text: '#991b1b' })}
<tr><td style="padding:10px 14px;font-size:12px;color:#888;line-height:1.6;">
${ended.map(renderEndedLine).join(', ')}
</td></tr>
</table>`;
    }
  }

  // ── Section 2: General hackathons · Devpost (online, open) ──
  if (devpostEvents.length > 0) {
    const shown = devpostEvents.slice(0, limit);
    body += `
<table width="100%" cellpadding="0" cellspacing="0" style="margin-bottom:4px;">
<tr><td style="padding:12px 14px 4px;font-size:15px;font-weight:800;color:#111;">
Hackathons Gerais · Devpost <span style="font-weight:400;font-size:12px;color:#666;">(online, open · ${devpostEvents.length})</span>
</td></tr>
</table>
<table width="100%" cellpadding="0" cellspacing="0" style="margin-bottom:12px;">
${sectionHeader('Online · Open', devpostEvents.length, { bg: '#eff6ff', border: '#3b82f6', text: '#1e40af' })}
${shown.map(renderDevpostCard).join('')}
${moreNote(devpostEvents.length, shown.length)}
</table>`;
  }

  return `<!DOCTYPE html>
<html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:#f6f6f6;font-family:Arial,Helvetica,sans-serif;">
<table width="100%" cellpadding="0" cellspacing="0"><tr><td align="center" style="padding:24px 8px;">
<table width="580" cellpadding="0" cellspacing="0" style="background:#fff;border-radius:8px;overflow:hidden;">

<!-- Header -->
<tr><td style="background:#ec3750;padding:20px 24px;text-align:center;">
<h1 style="margin:0;color:#fff;font-size:22px;font-weight:800;">HCNoticer</h1>
<p style="margin:4px 0 0;color:rgba(255,255,255,0.85);font-size:13px;">${totalNew} new event${totalNew !== 1 ? 's' : ''} &middot; ${esc(now)}</p>
</td></tr>

<!-- Body -->
<tr><td style="padding:10px 10px 20px;">
${body}
</td></tr>

<!-- Footer -->
<tr><td style="padding:14px 24px;text-align:center;border-top:1px solid #eee;">
<p style="margin:0;font-size:11px;color:#aaa;">
<a href="https://github.com/TheusHen/HCNoticer" style="color:#ec3750;text-decoration:none;">HCNoticer</a> &middot; <a href="https://ysws.hackclub.com" style="color:#ec3750;text-decoration:none;">YSWS Catalog</a> &middot; <a href="https://devpost.com/hackathons" style="color:#ec3750;text-decoration:none;">Devpost</a>
</p>
</td></tr>

</table>
</td></tr></table>
</body></html>`;
}

export function buildEmailSubject(results: NewEventsResult[]): string {
  const yswsCount = eventsOf(results, 'ysws').length;
  const devpostCount = eventsOf(results, 'devpost').length;
  const totalNew = yswsCount + devpostCount;
  const names = eventsOf(results, 'ysws')
    .concat(eventsOf(results, 'devpost'))
    .slice(0, 3)
    .map(e => e.name);
  const suffix = totalNew > 3 ? ` +${totalNew - 3} more` : '';
  const breakdown =
    yswsCount > 0 && devpostCount > 0
      ? `${yswsCount} YSWS + ${devpostCount} Devpost`
      : `${totalNew} new`;
  return `[HCNoticer] ${breakdown}: ${names.join(', ')}${suffix}`;
}
