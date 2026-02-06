import { fetchYSWSData } from './fetcher';
import { diffEvents, isFirstRun } from './diff';
import { sendNotification } from './mailer';
import { displayResults } from './display';
import { log } from './logger';

async function main(): Promise<void> {
  const start = performance.now();

  log.banner();
  log.timestamp();

  const checkOnly = process.argv.includes('--check');
  const firstRun = isFirstRun();

  // Fetch
  log.info('Fetching YSWS catalog...');
  let data;
  try {
    data = await fetchYSWSData();
  } catch (err) {
    log.error(`Failed to fetch data: ${(err as Error).message}`);
    process.exit(1);
  }

  const totalEvents =
    (data.limitedTime?.length || 0) +
    (data.indefinite?.length || 0) +
    (data.recentlyEnded?.length || 0) +
    (data.drafts?.length || 0);

  log.success(`Fetched ${totalEvents} events from YSWS Catalog`);

  // Diff
  log.info('Comparing with known events...');
  const results = diffEvents(data);
  const totalNew = results.reduce((sum, r) => sum + r.newEvents.length, 0);

  if (firstRun && totalNew > 0) {
    log.info(`First run — ${totalNew} events cataloged`);
  }

  // Display
  displayResults(results, totalEvents);

  // Email (skip in check-only mode)
  if (checkOnly) {
    log.info('Check-only mode — skipping email');
    log.elapsed(performance.now() - start);
    return;
  }

  if (totalNew > 0) {
    log.info('Sending email notification...');
    await sendNotification(results);
  }

  log.elapsed(performance.now() - start);
}

main().catch((err) => {
  log.error(`Unhandled error: ${(err as Error).message}`);
  process.exit(1);
});
