import { YSWSEvent, NewEventsResult } from './types';
import {
  stripHtml,
  sanitizeSlackUrl,
  formatDeadline,
  isDeadlineSoon,
  isExpired,
  extractDeadlineFromHtml,
} from './sanitize';

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

function splitByStatus(results: NewEventsResult[]) {
  const active: YSWSEvent[] = [];
  const draft: YSWSEvent[] = [];
  const ended: YSWSEvent[] = [];

  for (const r of results) {
    for (const e of r.newEvents) {
      if (e.status === 'active') active.push(e);
      else if (e.status === 'draft') draft.push(e);
      else ended.push(e);
    }
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

export function buildEmailHtml(results: NewEventsResult[]): string {
  const { active, draft, ended } = splitByStatus(results);
  const totalNew = active.length + draft.length + ended.length;
  const now = new Date().toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });

  let body = '';

  // Active events — full cards
  if (active.length > 0) {
    body += `
<table width="100%" cellpadding="0" cellspacing="0" style="margin-bottom:20px;">
<tr><td style="padding:8px 14px;background:#ecfdf5;border-left:3px solid #22c55e;font-size:13px;font-weight:700;color:#166534;text-transform:uppercase;letter-spacing:0.5px;">
Active (${active.length})
</td></tr>
${active.map(renderActiveCard).join('')}
</table>`;
  }

  // Drafts — compact rows
  if (draft.length > 0) {
    body += `
<table width="100%" cellpadding="0" cellspacing="0" style="margin-bottom:20px;">
<tr><td style="padding:8px 14px;background:#fefce8;border-left:3px solid #eab308;font-size:13px;font-weight:700;color:#854d0e;text-transform:uppercase;letter-spacing:0.5px;">
Drafts (${draft.length})
</td></tr>
${draft.map(renderDraftRow).join('')}
</table>`;
  }

  // Ended — plain comma-separated list
  if (ended.length > 0) {
    body += `
<table width="100%" cellpadding="0" cellspacing="0" style="margin-bottom:20px;">
<tr><td style="padding:8px 14px;background:#fef2f2;border-left:3px solid #ef4444;font-size:13px;font-weight:700;color:#991b1b;text-transform:uppercase;letter-spacing:0.5px;">
Ended (${ended.length})
</td></tr>
<tr><td style="padding:10px 14px;font-size:12px;color:#888;line-height:1.6;">
${ended.map(renderEndedLine).join(', ')}
</td></tr>
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
<tr><td style="padding:20px 10px;">
${body}
</td></tr>

<!-- Footer -->
<tr><td style="padding:14px 24px;text-align:center;border-top:1px solid #eee;">
<p style="margin:0;font-size:11px;color:#aaa;">
<a href="https://github.com/TheusHen/HCNoticer" style="color:#ec3750;text-decoration:none;">HCNoticer</a> &middot; <a href="https://ysws.hackclub.com" style="color:#ec3750;text-decoration:none;">YSWS Catalog</a>
</p>
</td></tr>

</table>
</td></tr></table>
</body></html>`;
}

export function buildEmailSubject(results: NewEventsResult[]): string {
  const { active, draft, ended } = splitByStatus(results);
  const totalNew = active.length + draft.length + ended.length;
  const names = active.concat(draft).slice(0, 3).map(e => e.name);
  const suffix = totalNew > 3 ? ` +${totalNew - 3} more` : '';
  return `[HCNoticer] ${totalNew} new: ${names.join(', ')}${suffix}`;
}
