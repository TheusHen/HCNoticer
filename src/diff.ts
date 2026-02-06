import * as fs from 'fs';
import * as path from 'path';
import { AppState, YSWSData, YSWSEvent, NewEventsResult } from './types';
import { config } from './config';

function loadState(): AppState {
  try {
    if (fs.existsSync(config.stateFile)) {
      const raw = fs.readFileSync(config.stateFile, 'utf-8');
      return JSON.parse(raw);
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

  for (const cat of categories) {
    const events: YSWSEvent[] = data[cat.key] || [];
    const newEvents = events.filter(e => !knownSet.has(e.name));
    allCurrentNames.push(...events.map(e => e.name));

    if (newEvents.length > 0) {
      results.push({
        newEvents,
        allCurrentNames: events.map(e => e.name),
        category: cat.label,
      });
    }
  }

  // Persist updated state
  const updatedState: AppState = {
    knownEvents: [...new Set(allCurrentNames)],
    lastCheck: new Date().toISOString(),
  };
  saveState(updatedState);

  return results;
}

export function isFirstRun(): boolean {
  return !fs.existsSync(config.stateFile);
}
