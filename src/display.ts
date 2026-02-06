import { NewEventsResult } from './types';
import { formatDeadline } from './sanitize';
import { log } from './logger';

export function displayResults(results: NewEventsResult[], totalTracked: number): void {
  const totalNew = results.reduce((sum, r) => sum + r.newEvents.length, 0);

  if (totalNew === 0) {
    log.summary(0, totalTracked);
    return;
  }

  for (const result of results) {
    log.category(result.category, result.newEvents.length);
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
