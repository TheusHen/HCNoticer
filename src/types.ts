export interface YSWSEvent {
  name: string;
  description: string;
  website?: string;
  slack?: string;
  slackChannel?: string;
  status: string;
  deadline?: string;
  detailedDescription?: string;
  steps?: string[];
  requirements?: string[];
  details?: string[];
  participants?: number;
  ended?: string;
}

export interface YSWSData {
  limitedTime: YSWSEvent[];
  recentlyEnded: YSWSEvent[];
  indefinite: YSWSEvent[];
  drafts: YSWSEvent[];
}

export interface AppState {
  knownEvents: string[];
  lastCheck: string;
}

export interface NewEventsResult {
  newEvents: YSWSEvent[];
  allCurrentNames: string[];
  category: string;
}
