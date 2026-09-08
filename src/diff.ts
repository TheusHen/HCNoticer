import * as fs from 'fs';
import * as path from 'path';
import { AppState, YSWSData, YSWSEvent, NewEventsResult } from './types';
import { config } from './config';

function migrateKeys(keys: string[]): string[] {
  return keys.map(k =>
    k.startsWith('ysws:') || k.startsWith('devpost:') ? k : `ysws:${k}`
  );
}

function loadState(): AppState {
  try {
    if (fs.existsSync(config.stateFile)) {
      const raw = fs.readFileSync(config.stateFile, 'utf-8');
      const parsed = JSON.parse(raw) as AppState;
      const knownEvents = Array.isArray(parsed.knownEvents)
        ? migrateKeys(parsed.knownEvents)
        : [];
      return { knownEvents, lastCheck: parsed.lastCheck || '' };
    }
  } catch {
    // Corrupted state file — start fresh
  }
  return { knownEvents: [], lastCheck: '' };
}

function saveState(state: AppState): void {
  const dir = path.dirname(config.stateFile);
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
  fs.writeFileSync(config.stateFile, JSON.stringify(state, null, 2), 'utf-8');
}

export function yswsKey(name: string): string {
  return `ysws:${name}`;
}

export function devpostKey(e: YSWSEvent): string {
  return `devpost:${e.externalId || e.name}`;
}

function persistMerged(currentKeys: string[], prefix: 'ysws:' | 'devpost:'): void {
  const state = loadState();
  const kept = state.knownEvents.filter(k => !k.startsWith(prefix));
  const updatedState: AppState = {
    knownEvents: [...kept, ...new Set(currentKeys)],
    lastCheck: new Date().toISOString(),
  };
  saveState(updatedState);
}

export function diffEvents(data: YSWSData): NewEventsResult[] {
  const state = loadState();
  const knownSet = new Set(state.knownEvents);

  const categories: { key: keyof YSWSData; label: string }[] = [
    { key: 'limitedTime', label: 'Limited Time' },
    { key: 'indefinite', label: 'Indefinite' },
    { key: 'recentlyEnded', label: 'Recently Ended' },
    { key: 'drafts', label: 'Drafts' },
  ];

  const results: NewEventsResult[] = [];
  const allCurrentNames: string[] = [];
  const allCurrentKeys: string[] = [];

  for (const cat of categories) {
    const events: YSWSEvent[] = data[cat.key] || [];
    const newEvents = events.filter(e => !knownSet.has(yswsKey(e.name)));
    allCurrentNames.push(...events.map(e => e.name));
    allCurrentKeys.push(...events.map(e => yswsKey(e.name)));

    if (newEvents.length > 0) {
      results.push({
        newEvents,
        allCurrentNames: events.map(e => e.name),
        category: cat.label,
        source: 'ysws',
      });
    }
  }

  // Persist updated state (keep devpost:* keys untouched)
  persistMerged(allCurrentKeys, 'ysws:');

  return results;
}

export function diffDevpostEvents(events: YSWSEvent[]): NewEventsResult[] {
  const state = loadState();
  const knownSet = new Set(state.knownEvents);

  const newEvents = events.filter(e => !knownSet.has(devpostKey(e)));
  persistMerged(events.map(devpostKey), 'devpost:');

  if (newEvents.length === 0) return [];
  return [
    {
      newEvents,
      allCurrentNames: events.map(e => e.name),
      category: 'Online · Open',
      source: 'devpost',
    },
  ];
}

export function isFirstRun(): boolean {
  return !fs.existsSync(config.stateFile);
}
