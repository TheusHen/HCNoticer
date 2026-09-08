import { NewEventsResult } from './types';
import { formatDeadline } from './sanitize';
import { log } from './logger';

export function displayResults(
  results: NewEventsResult[],
  totalTracked: number,
  yswsTotal = 0,
  devpostTotal = 0
): void {
  const totalNew = results.reduce((sum, r) => sum + r.newEvents.length, 0);

  if (totalNew === 0) {
    log.summary(0, totalTracked);
    if (yswsTotal + devpostTotal > 0) {
      log.info(`Tracked: ${yswsTotal} YSWS + ${devpostTotal} Devpost (online/open)`);
    }
    return;
  }

  const sourceLabel = (s: string | undefined) =>
    s === 'devpost' ? 'Devpost' : 'YSWS';

  for (const result of results) {
    log.category(`${sourceLabel(result.source)} · ${result.category}`, result.newEvents.length);
    for (const event of result.newEvents) {
      log.event(
        event.name,
        event.status,
        formatDeadline(event.deadline),
        result.category
      );
    }
  }

  log.summary(totalNew, totalTracked);
}
