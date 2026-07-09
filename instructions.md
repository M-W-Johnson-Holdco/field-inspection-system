# Field Inspection App — Setup Instructions for a New Company

This document covers everything needed to stand up a copy of this app for a new company from scratch. Follow the steps in order.

---

## Overview of What You're Building

- A React PWA (Progressive Web App) hosted on GitHub Pages
- Google OAuth login restricted to a specific Google Workspace domain
- Inspections saved to a company Google Shared Drive
- A Cloudflare Worker that relays transcript parsing requests to the Anthropic (Claude) API
- Auto-deploy on every push to `main` via GitHub Actions

---

## Accounts You Will Need

Before starting, make sure you have access to or can create accounts at:

| Service | Purpose | URL |
|---|---|---|
| GitHub | Host the code and deploy Pages | github.com |
| Google Cloud Console | OAuth credentials + Drive API | console.cloud.google.com |
| Google Workspace | Company Google accounts (must already exist) | admin.google.com |
| Cloudflare | Host the AI relay Worker | cloudflare.com |
| Anthropic | Claude API key for AI parsing | console.anthropic.com |

---

## Step 1 — Fork or Copy the Repository

1. Go to the original repo on GitHub
2. Click **Fork** (or create a new repo and copy the files in)
3. Clone it locally:
   ```
   git clone https://github.com/YOUR-ORG/YOUR-REPO-NAME.git
   cd YOUR-REPO-NAME
   npm install
   ```

---

## Step 2 — Google Cloud Console Setup

### 2A — Create a new project

1. Go to [console.cloud.google.com](https://console.cloud.google.com)
2. Click the project dropdown at the top → **New Project**
3. Name it something like `Peachtree Field Inspection`
4. Click **Create**

### 2B — Enable the Google Drive API

1. In the left sidebar go to **APIs & Services → Library**
2. Search for **Google Drive API** and click it
3. Click **Enable**

### 2C — Create OAuth credentials

1. Go to **APIs & Services → Credentials**
2. Click **+ Create Credentials → OAuth client ID**
3. If prompted to configure the consent screen first:
   - User type: **Internal** (restricts to your Google Workspace domain only)
   - Fill in app name, support email, and developer email
   - Add scopes: `openid`, `email`, `profile`, `https://www.googleapis.com/auth/drive`
   - Save
4. Back on Create OAuth client ID:
   - Application type: **Web application**
   - Name: `Field Inspection App`
   - Authorized JavaScript origins — add both:
     ```
     http://localhost:5173
     https://YOUR-ORG.github.io
     ```
   - Authorized redirect URIs — add:
     ```
     https://YOUR-ORG.github.io/YOUR-REPO-NAME/
     ```
   - Click **Create**
5. Copy the **Client ID** — you will need it in Steps 4 and 5

> **Secret to save:** `VITE_GOOGLE_CLIENT_ID` = the Client ID ending in `.apps.googleusercontent.com`

---

## Step 3 — Google Shared Drive Setup

1. Go to [drive.google.com](https://drive.google.com)
2. In the left sidebar click **Shared drives → New**
3. Name it something like `Field Inspections — Peachtree Roofing`
4. Click **Create**
5. Right-click the new Shared Drive → **Manage members**
6. Add inspectors, PMs, and admins with appropriate roles (Contributor for inspectors, Manager for PMs)
7. Get the Shared Drive ID from the URL:
   ```
   https://drive.google.com/drive/folders/XXXXXXXXXXXXXXXX
                                           ^^^^^^^^^^^^^^^^
                                           This is your Drive ID
   ```

> **Value to save:** Shared Drive ID

---

## Step 4 — Update the Code for the New Company

Make the following changes in the codebase:

### 4A — Replace the company logo

Replace `src/assets/tc_logo.png` with the new company's logo file (PNG recommended).

### 4B — Update the allowed Google Workspace domain

In `src/context/AuthContext.jsx`, find:
```js
const ALLOWED_DOMAIN = 'tcroofingexperts.com'
```
Change it to the new company's Google Workspace domain.

### 4C — Update the Shared Drive ID

In `src/lib/driveService.js`, find:
```js
const SHARED_DRIVE_ID = '0AGzZsZcVSAPaUk9PVA'
```
Replace with the new Shared Drive ID from Step 3.

### 4D — Update the Worker URL

In `src/components/sections/AIParseSection.jsx`, find:
```js
const WORKER_URL = 'https://tc-field-inspection-worker.k-liss.workers.dev'
```
Replace with the new Worker URL from Step 5.

### 4E — Update the CORS allowed origin in the Worker

In `tc-field-inspection-worker/src/index.ts`, find:
```ts
const ALLOWED_ORIGIN = 'https://peachtreeroofing.github.io'
```
Replace with:
```ts
const ALLOWED_ORIGIN = 'https://YOUR-ORG.github.io'
```

### 4F — Update the Vite base path

In `vite.config.js`, find:
```js
base: '/field-inspection-system/',
```
Replace with:
```js
base: '/YOUR-REPO-NAME/',
```

### 4G — Update the app title and manifest

- In `index.html`: update `<title>` and any company name references
- In `public/manifest.webmanifest`: update `name` and `short_name`

---

## Step 5 — Cloudflare Worker Setup

### 5A — Create a Cloudflare account

1. Go to [cloudflare.com](https://cloudflare.com) and sign up or log in
2. In the dashboard go to **Workers & Pages → Create**
3. Choose **Worker** → name it something like `peachtree-field-inspection-worker`

### 5B — Install Wrangler and log in

```
cd tc-field-inspection-worker
npm install
npx wrangler login
```

### 5C — Update wrangler.jsonc

In `tc-field-inspection-worker/wrangler.jsonc`, update the worker name:
```json
"name": "peachtree-field-inspection-worker"
```

### 5D — Deploy the Worker

```
npx wrangler deploy
```

Copy the Worker URL from the output (e.g. `https://peachtree-field-inspection-worker.YOUR-SUBDOMAIN.workers.dev`).

### 5E — Add the Anthropic API key as a Worker secret

Get an API key from [console.anthropic.com](https://console.anthropic.com), then:
```
npx wrangler secret put ANTHROPIC_API_KEY
```
Paste the key when prompted.

> **Secret stored in Cloudflare (not in code):** `ANTHROPIC_API_KEY`

---

## Step 6 — GitHub Repository Setup

### 6A — Add repository secrets

Go to your GitHub repo → **Settings → Secrets and variables → Actions → New repository secret**

Add this secret:

| Secret name | Value |
|---|---|
| `VITE_GOOGLE_CLIENT_ID` | The OAuth Client ID from Step 2C |

### 6B — Configure GitHub Pages

1. Go to **Settings → Pages**
2. Under **Build and deployment → Source**, select **GitHub Actions**
3. Save

---

## Step 7 — Local Development Setup

Create a `.env.local` file in the project root (this file is gitignored — never commit it):

```
VITE_GOOGLE_CLIENT_ID=your-client-id.apps.googleusercontent.com
```

Run the app locally:
```
npm run dev
```

---

## Step 8 — Deploy

Push to `main` and GitHub Actions will automatically build and deploy to GitHub Pages:

```
git add .
git commit -m "Initial setup for Peachtree Roofing"
git push
```

Monitor the deploy at: `https://github.com/YOUR-ORG/YOUR-REPO-NAME/actions`

---

## Summary of All Secrets and Where They Live

| Secret | Where It's Stored | How It's Used |
|---|---|---|
| `VITE_GOOGLE_CLIENT_ID` | GitHub Actions secret | Baked into the React build at deploy time |
| `ANTHROPIC_API_KEY` | Cloudflare Worker secret | Used server-side by the Worker to call Claude |
| Shared Drive ID | Hardcoded in `src/lib/driveService.js` | Targets the correct Shared Drive for saving inspections |

> The `.env.local` file (local dev only) holds `VITE_GOOGLE_CLIENT_ID` for running the app on your machine. It is gitignored and should never be committed.

---

## Checklist

- [ ] Google Cloud project created
- [ ] Google Drive API enabled
- [ ] OAuth consent screen configured (Internal, correct scopes)
- [ ] OAuth Client ID created, JavaScript origins and redirect URIs set
- [ ] Shared Drive created, members added
- [ ] `ALLOWED_DOMAIN` updated in `AuthContext.jsx`
- [ ] Shared Drive ID updated in `driveService.js`
- [ ] Company logo replaced in `src/assets/`
- [ ] Cloudflare Worker deployed with correct name and CORS origin
- [ ] `ANTHROPIC_API_KEY` added as Cloudflare Worker secret
- [ ] Worker URL updated in `AIParseSection.jsx`
- [ ] Vite base path updated in `vite.config.js`
- [ ] `VITE_GOOGLE_CLIENT_ID` added as GitHub Actions secret
- [ ] GitHub Pages source set to GitHub Actions
- [ ] Pushed to `main` and confirmed deploy succeeded
- [ ] Logged in and tested a save to Google Drive
