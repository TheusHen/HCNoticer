export type HackathonSource = 'ysws' | 'devpost';

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
  // Normalized extra fields (used by Devpost, optional for YSWS)
  source?: HackathonSource;
  url?: string;
  location?: string;
  themes?: string[];
  prize?: string;
  registrations?: number;
  submissionDates?: string;
  timeLeft?: string;
  organization?: string;
  externalId?: string;
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
  source: HackathonSource;
}

// Raw Devpost API shapes (https://devpost.com/api/hackathons — public, no auth)
export interface DevpostRawHackathon {
  id: number;
  title: string;
  url: string;
  open_state: string;
  displayed_location?: { icon?: string; location?: string };
  submission_period_dates?: string;
  time_left_to_submission?: string;
  themes?: { id: number; name: string }[];
  prize_amount?: string;
  registrations_count?: number;
  organization_name?: string;
  thumbnail_url?: string;
  invite_only?: boolean;
}

export interface DevpostApiResponse {
  hackathons: DevpostRawHackathon[];
  meta?: { total_count?: number; per_page?: number };
}
