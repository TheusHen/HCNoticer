import { decode } from 'html-entities';

/**
 * Strip HTML tags from a string and decode entities.
 * Preserves text content only.
 */
export function stripHtml(html: string): string {
  if (!html) return '';
  // Replace <br> variants with newlines
  let text = html.replace(/<br\s*\/?>/gi, '\n');
  // Replace block-level closing tags with newlines
  text = text.replace(/<\/(p|div|li|h[1-6])>/gi, '\n');
  // Strip all remaining tags
  text = text.replace(/<[^>]*>/g, '');
  // Decode HTML entities
  text = decode(text);
  // Collapse excessive whitespace on each line
  text = text
    .split('\n')
    .map(line => line.replace(/\s+/g, ' ').trim())
    .filter(Boolean)
    .join('\n');
  return text.trim();
}

/**
 * Extract deadline from HTML description.
 * Looks for <strong>Deadline:</strong> pattern.
 */
export function extractDeadlineFromHtml(html: string): string | null {
  if (!html) return null;
  const match = html.match(/<strong>\s*Deadline:\s*<\/strong>\s*([^<\n]+)/i);
  if (match) {
    return decode(match[1]).trim();
  }
  return null;
}

/**
 * Sanitize a Slack URL — returns null for "undefined" or invalid URLs.
 */
export function sanitizeSlackUrl(url: string | undefined): string | null {
  if (!url) return null;
  const trimmed = url.trim();
  if (
    trimmed === 'undefined' ||
    trimmed === 'null' ||
    trimmed === '' ||
    !trimmed.startsWith('http')
  ) {
    return null;
  }
  return trimmed;
}

/**
 * Format a deadline string into a human-readable format.
 */
export function formatDeadline(deadline: string | undefined): string {
  if (!deadline) return 'No deadline';
  try {
    const d = new Date(deadline);
    if (isNaN(d.getTime())) return deadline;
    return d.toLocaleDateString('en-US', {
      weekday: 'short',
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      timeZoneName: 'short',
    });
  } catch {
    return deadline;
  }
}

/**
 * Check if a deadline is approaching (within 7 days).
 */
export function isDeadlineSoon(deadline: string | undefined): boolean {
  if (!deadline) return false;
  try {
    const d = new Date(deadline);
    if (isNaN(d.getTime())) return false;
    const now = new Date();
    const diff = d.getTime() - now.getTime();
    const days = diff / (1000 * 60 * 60 * 24);
    return days > 0 && days <= 7;
  } catch {
    return false;
  }
}

/**
 * Check if a deadline has passed.
 */
export function isExpired(deadline: string | undefined): boolean {
  if (!deadline) return false;
  try {
    const d = new Date(deadline);
    if (isNaN(d.getTime())) return false;
    return d.getTime() < Date.now();
  } catch {
    return false;
  }
}
