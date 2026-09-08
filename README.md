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

Run it via GitHub Actions (every 6 hours by default — see `.github/workflows/notify.yml`) or locally:

```bash
npm start
```

The Actions workflow installs deps, builds, runs `npm start` (which fetches both sources, sends the email via MailerSend when there are new events, and updates `data/state.json`), then commits and pushes the updated state back to the repo — no extra infrastructure needed.

Configure the required Secrets (`MAILERSEND_API_KEY`, `EMAIL_FROM_NAME`, `EMAIL_FROM_EMAIL`, `EMAIL_TO`) and optional Variables (`YSWS_API_URL`, `DEVPOST_API_URL`, `DEVPOST_MAX_PAGES`, `DEVPOST_SEARCH`, `EMAIL_MAX_PER_SOURCE`, `CO_AUTHOR_NAME`, `CO_AUTHOR_EMAIL`) under Settings → Secrets and variables → Actions.

## License

MIT
