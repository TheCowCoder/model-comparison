# AI Model Comparison

Public-facing AI model rankings and head-to-head comparisons with a password-protected admin route at `/admin`.

The app is now structured for two runtimes:

1. Local development with the Node server in [server.ts](server.ts)
2. Free production deployment on Cloudflare Workers + D1 using [src/worker.ts](src/worker.ts) and [wrangler.jsonc](wrangler.jsonc)

## Local Development

Required environment variables in your local `.env`:

```env
GEMINI_API_KEY=your_gemini_key
ADMIN_PASSWORD=choose_a_strong_password
SESSION_SECRET=optional_extra_secret
```

Run locally:

```bash
npm install
npm run dev
```

The local app will be available at `http://localhost:3000`.

## Free Production Deployment

Recommended free platform: Cloudflare Workers + D1.

Why this is the right fit:

1. No sleeping Node container
2. Static app and API routes deploy together
3. Secrets stay server-side
4. D1 provides persistent storage for the published dataset

### What You Need Before Deploying

1. A Cloudflare account
2. This project pushed to GitHub
3. A Gemini API key
4. An admin password you will use for `/admin`

## Exact Free-Now Publish Steps

This is the fastest path to get the site live right now.

### 1. Install and log into Wrangler

```bash
npm install
npx wrangler login
```

### 2. Create the D1 database

```bash
npx wrangler d1 create ai-model-comparison
```

Cloudflare will print a `database_id`.

Open [wrangler.jsonc](wrangler.jsonc) and replace `REPLACE_WITH_YOUR_D1_DATABASE_ID` with that value.

### 3. Create the D1 table

```bash
npx wrangler d1 execute ai-model-comparison --remote --file=./schema.sql
```

### 4. Seed the existing benchmark data into D1

```bash
npm run cf:seed -- ai-model-comparison --remote
```

### 5. Add production secrets

```bash
npx wrangler secret put GEMINI_API_KEY
npx wrangler secret put ADMIN_PASSWORD
npx wrangler secret put SESSION_SECRET
```

### 6. Build and deploy

```bash
npm run cf:deploy
```

Cloudflare will return a production URL like `https://ai-model-comparison.<your-subdomain>.workers.dev`.

## Click-By-Click Cloudflare Dashboard Flow

If you want the web-click path instead of mostly terminal:

1. Push this repo to GitHub.
2. In Cloudflare Dashboard, open `Workers & Pages`.
3. Click `Create`.
4. Click `Import a repository`.
5. Connect GitHub and select this repo.
6. In the project setup screen, keep the Worker entry as the repo default and set the build command to `npm run build`.
7. Set the output directory to `dist`.
8. Finish the import.
9. In Cloudflare Dashboard, open `Storage & Databases`.
10. Create a new `D1` database named `ai-model-comparison`.
11. Copy the database ID into [wrangler.jsonc](wrangler.jsonc).
12. In the Worker project settings, add secrets named `GEMINI_API_KEY`, `ADMIN_PASSWORD`, and `SESSION_SECRET`.
13. Redeploy the project.
14. Run the seed command once from your machine so the live D1 database gets your current benchmark dataset.

The dashboard can create the app and database, but seeding the existing JSON dataset still needs the one command above.

## Routes

1. `/` public homepage with compare flow and prominent leaderboard CTA
2. `/compare` public head-to-head comparison
3. `/leaderboards` public rankings and natural-language search
4. `/admin` password-protected admin dashboard

## Security and Robustness Changes Included

1. Gemini calls now happen server-side only
2. `/admin` is gated by password and verified by server session cookie
3. Dataset writes require authentication
4. Health endpoint is available at `/health`
5. API routes include basic request validation and rate limiting
6. State is sanitized before save/load
7. Default model heuristics are deterministic instead of random

## Files Added for Deployment

1. [src/worker.ts](src/worker.ts): Cloudflare Worker API and asset handler
2. [wrangler.jsonc](wrangler.jsonc): Worker + D1 configuration
3. [schema.sql](schema.sql): D1 schema
4. [scripts/seed-d1.mjs](scripts/seed-d1.mjs): one-command D1 seed from [benchmarks_data.json](benchmarks_data.json)

## Quick Verification Checklist

After deploy:

1. Visit `/` and confirm the homepage loads
2. Visit `/leaderboards` and run a search
3. Visit `/admin` and confirm the password prompt appears
4. Log in and publish a small change
5. Refresh the site and confirm the change persisted
6. Visit `/health` and confirm it returns JSON
