import { fetchYSWSData } from './fetcher';
import { fetchDevpostHackathons } from './devpost';
import { diffEvents, diffDevpostEvents, isFirstRun } from './diff';
import { sendNotification } from './mailer';
import { displayResults } from './display';
import { log } from './logger';
import { NewEventsResult, YSWSEvent } from './types';

async function runOnce(checkOnly: boolean): Promise<void> {
  const start = performance.now();

  log.banner();
  log.timestamp();

  const firstRun = isFirstRun();

  // Fetch both sources in parallel — Devpost failing shouldn't kill YSWS
  log.info('Fetching YSWS catalog + Devpost hackathons...');
  const [yswsSettled, devpostSettled] = await Promise.allSettled([
    fetchYSWSData(),
    fetchDevpostHackathons(),
  ]);

  let yswsTotal = 0;
  let devpostTotal = 0;
  const results: NewEventsResult[] = [];

  if (yswsSettled.status === 'fulfilled') {
    const data = yswsSettled.value;
    yswsTotal =
      (data.limitedTime?.length || 0) +
      (data.indefinite?.length || 0) +
      (data.recentlyEnded?.length || 0) +
      (data.drafts?.length || 0);
    log.success(`Fetched ${yswsTotal} events from YSWS Catalog`);
    log.info('Comparing YSWS with known events...');
    results.push(...diffEvents(data));
  } else {
    log.error(`Failed to fetch YSWS data: ${(yswsSettled.reason as Error)?.message}`);
  }

  if (devpostSettled.status === 'fulfilled') {
    const devpostEvents: YSWSEvent[] = devpostSettled.value;
    devpostTotal = devpostEvents.length;
    log.success(`Fetched ${devpostTotal} online/open hackathons from Devpost`);
    log.info('Comparing Devpost with known events...');
    results.push(...diffDevpostEvents(devpostEvents));
  } else {
    log.error(`Failed to fetch Devpost data: ${(devpostSettled.reason as Error)?.message}`);
  }

  if (yswsSettled.status === 'rejected' && devpostSettled.status === 'rejected') {
    throw (yswsSettled as PromiseRejectedResult).reason;
  }

  const totalTracked = yswsTotal + devpostTotal;
  const totalNew = results.reduce((sum, r) => sum + r.newEvents.length, 0);

  if (firstRun && totalNew > 0) {
    log.info(`First run — ${totalNew} events cataloged`);
  }

  // Display
  displayResults(results, totalTracked, yswsTotal, devpostTotal);

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

async function main(): Promise<void> {
  const checkOnly = process.argv.includes('--check');

  await runOnce(checkOnly);
}

main().catch((err) => {
  log.error(`Unhandled error: ${(err as Error).message}`);
  process.exit(1);
});
