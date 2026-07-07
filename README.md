# HCNoticer

Monitors the [Hack Club YSWS Catalog](https://ysws.hackclub.com) for new events and sends email notifications when new programs appear.

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

1. Fetches the current YSWS catalog from the [YSWS-Catalog API](https://github.com/hackclub/YSWS-Catalog)
2. Compares against previously known events stored in `data/state.json`
3. Displays new events in the terminal with status, deadlines, and categories
4. Sends an HTML email notification listing all new events
5. Updates the state file for the next run

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
