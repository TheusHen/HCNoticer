# HCNoticer

Monitors the [Hack Club YSWS Catalog](https://ysws.hackclub.com) **and** general hackathons from [Devpost](https://devpost.com/hackathons) for new events, and sends email notifications when new programs appear.

The email has two dedicated sections:

1. **HackClub YSWS** — active / drafts / ended, from the [YSWS-Catalog API](https://github.com/hackclub/YSWS-Catalog)
2. **Hackathons Gerais · Devpost** — online hackathons with open submissions, from the public `devpost.com/api/hackathons` endpoint (no auth needed, max 10 per email by default)

## Setup

```bash
npm install
npm run build
```

Copy `.env.example` to `.env` and configure your SMTP credentials and recipients:

```bash
cp .env.example .env
```

## Usage

```bash
# First run — saves current events as baseline (no emails sent)
npm start

# Subsequent runs — detects new events, sends email if any found
npm start

# Check-only mode — shows new events in terminal without sending email
npm run check
```

## How It Works

1. Fetches the current YSWS catalog from the [YSWS-Catalog API](https://github.com/hackclub/YSWS-Catalog) and online/open hackathons from the public [Devpost API](https://devpost.com/api/hackathons) (paginated, `DEVPOST_MAX_PAGES` pages, ~9 items each)
2. Keeps only Devpost hackathons that are **online** (`displayed_location.location == "Online"`) and **open** (`open_state == "open"`), skipping invite-only; optional keyword filter via `DEVPOST_SEARCH`
3. Compares against previously known events stored in `data/state.json` (keys namespaced as `ysws:<name>` / `devpost:<id>`, with automatic migration of legacy plain-name states)
4. Displays new events in the terminal grouped by source (YSWS / Devpost)
5. Sends an HTML email with a dedicated **HackClub YSWS** section plus a **Hackathons Gerais · Devpost** section (each capped at `EMAIL_MAX_PER_SOURCE`, default 10)
6. Updates the state file for the next run

Run it on a schedule (e.g. cron every hour) to stay notified about new YSWS programs.

## Fly.io

The GitHub Actions workflow still works as before. To run HCNoticer continuously on Fly.io instead, deploy it as a worker:

```bash
fly launch --no-deploy
fly volumes create hcnoticer_data --region gru --size 1
fly secrets set \
  MAILERSEND_API_KEY=mlsn.xxxxx \
  EMAIL_FROM_NAME=HCNoticer \
  EMAIL_FROM_EMAIL=noreply@your-domain.com \
  EMAIL_TO=recipient@example.com
fly deploy
```

Fly uses `npm run start:fly`, which runs `node dist/index.js --watch`.
The worker checks every `HCNOTICER_INTERVAL_SECONDS` seconds, defaulting to 300 seconds in `fly.toml`.
Its state is stored at `/data/state.json` on the Fly volume, so it keeps tracking events across restarts and deploys without relying on GitHub commits.

## License

MIT
