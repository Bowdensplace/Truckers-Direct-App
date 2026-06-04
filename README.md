# Truckers Direct — QBO Checklist App

Internal bookkeeping workflow tool for Trucker's Direct. Manages Monthly Close, Payroll Run, New Client Onboarding, AR Collections, and Payment Reconciliation workflows with QBO deep links, time tracking, and activity logs.

**Access:** Restricted to `@truckersdirect.net` Google Workspace accounts.

---

## Tech Stack

- **Frontend:** React + Vite + Tailwind CSS + shadcn/ui
- **Backend:** Express.js + SQLite (better-sqlite3 + Drizzle ORM)
- **Auth:** Google OAuth 2.0 (Passport.js)
- **Deployment:** Railway (auto-deploys on push to `main`)

---

## Local Development

### Prerequisites

- Node.js 18+
- A Google Cloud OAuth app (see [Google Setup](#google-oauth-setup) below)

### 1. Clone the repo

```bash
git clone https://github.com/Bowdensplace/Truckers-Direct-App.git
cd Truckers-Direct-App
```

### 2. Install dependencies

```bash
npm install
```

### 3. Set up environment variables

```bash
cp .env.example .env
```

Edit `.env` and fill in your values (see [Environment Variables](#environment-variables) below).

### 4. Run the dev server

```bash
npm run dev
```

The app runs at `http://localhost:5000`.

> **Note:** Google login requires valid OAuth credentials. In local dev without credentials, the app still loads — auth is bypassed so you can work on the UI.

---

## Production Deployment (Railway)

This repo is connected to Railway for automatic deploys. Every push to `main` triggers a new build and deploy.

### Railway Setup (first time)

1. Create a new Railway project → **Deploy from GitHub repo** → select this repo
2. Add a **Volume** mounted at `/data` (persists the SQLite database)
3. Set all [environment variables](#environment-variables) in the Railway Variables tab
4. Railway auto-detects `railway.toml` and uses the correct build/start commands

### Deploy a Change

```bash
git checkout -b my-feature
# make your changes
git add .
git commit -m "Description of change"
git push origin my-feature
# open a Pull Request on GitHub → merge to main → Railway auto-deploys
```

---

## Google OAuth Setup

1. Go to [Google Cloud Console](https://console.cloud.google.com)
2. Create a project → **APIs & Services → OAuth consent screen** → set to **Internal**
3. Go to **Credentials → Create OAuth 2.0 Client ID** (Web application)
4. Add authorized redirect URIs:
   - `https://app.truckersdirect.net/auth/google/callback`
   - `https://your-railway-url.railway.app/auth/google/callback`
5. Copy the Client ID and Client Secret into your environment variables

Only `@truckersdirect.net` Google Workspace accounts are permitted to log in.

---

## Environment Variables

| Variable | Required | Description |
|---|---|---|
| `GOOGLE_CLIENT_ID` | Yes | Google OAuth Client ID |
| `GOOGLE_CLIENT_SECRET` | Yes | Google OAuth Client Secret |
| `GOOGLE_CALLBACK_URL` | Yes | `https://app.truckersdirect.net/auth/google/callback` |
| `SESSION_SECRET` | Yes | Random 64-char string for signing session cookies |
| `DATA_DIR` | Yes | `/data` on Railway, `.` locally |
| `NODE_ENV` | Yes | `production` on Railway, `development` locally |
| `PORT` | Yes | `8080` on Railway, `5000` locally |

Generate a session secret:
```bash
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

---

## Project Structure
├── client/ # React frontend (Vite)
│ └── src/
│ ├── pages/ # Dashboard, WorkflowPage, LoginPage, SearchPage
│ ├── components/ # Layout, ProtectedRoute, UI components
│ └── lib/ # auth.ts, workflows.ts, queryClient.ts
├── server/ # Express backend
│ ├── auth.ts # Google OAuth + session setup
│ ├── routes.ts # API routes
│ └── storage.ts # SQLite/Drizzle data layer
├── shared/
│ └── schema.ts # Drizzle schema + Zod types
├── railway.toml # Railway build/deploy config
└── .env.example # Environment variable reference


---

## Branch Strategy

| Branch | Purpose |
|---|---|
| `main` | Production — protected, requires PR to merge |
| `feature/*` | New features or improvements |
| `fix/*` | Bug fixes |

**Never push directly to `main`.** Open a pull request, review the changes, then merge. Railway deploys automatically on merge.

---

## Database

SQLite database lives at `$DATA_DIR/data.db` (Railway persistent volume: `/data/data.db`).

### Backup

```bash
railway run cp /data/data.db ./backup-$(date +%Y%m%d).db
```

---

*Trucker's Direct — Internal Tool — Not for public distribution*
# Last updated: Thu Jun  4 23:12:16 UTC 2026
