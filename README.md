# Quando? — when can we all go?

A no-login shared availability calendar for planning a group trip. Everyone opens
the same link, taps the days they're free, and the calendar lights up: the brighter
a day, the more of you can make it. The best window floats to the top automatically.

Built for the eternal problem of "we can never find a date that works."

- **No accounts.** People just type their name and tap dates.
- **Shared.** Everyone sees everyone's availability live.
- **One job.** It answers "when?" and gets out of the way.

Stack: Next.js 15 (App Router) · TypeScript · Upstash Redis · deploys to Vercel.

---

## Deploy it (about 5 minutes)

### 1. Put the code on GitHub
```bash
cd quando
git init && git add -A && git commit -m "Quando"
gh repo create quando --private --source=. --push   # or push to a repo you made
```

### 2. Import to Vercel
At [vercel.com/new](https://vercel.com/new), import the repo and click **Deploy**.
It'll go live straightaway — but saves won't stick until you add storage (next step).

### 3. Add the shared storage (Upstash Redis)
This is what makes the calendar shared instead of just yours.

1. In your Vercel project → **Storage** → **Create Database** → choose **Upstash for Redis**.
2. Connect it to this project. Vercel injects `UPSTASH_REDIS_REST_URL` and
   `UPSTASH_REDIS_REST_TOKEN` as environment variables for you.
3. **Redeploy** (Deployments → ⋯ → Redeploy) so the app picks up the variables.

That's it. The orange "storage isn't connected" banner disappears and saves persist.

> Free tier is plenty — a friend group is a handful of tiny records.

### 4. Share the link
Send everyone the Vercel URL. Each person adds their name and taps their free days.
The "best date so far" at the top updates as answers come in.

---

## Make it yours

Open `lib/trip.ts`:

```ts
export const TRIP = {
  name: "Italia",
  subtitle: "summer 2026",
  headline: "Find the week you can all actually go.",
  months: [[2026, 5], [2026, 6], [2026, 7], [2026, 8]], // [year, month] — Jan = 0
};
```

Change the destination name, the months shown, or the headline. No other edits needed.

Running more than one trip from the same deploy? Set a `TRIP_KEY` env var per
deployment (e.g. `quando:greece`, `quando:lisbon`) to keep them separate.

---

## Run locally
```bash
npm install
npm run dev        # http://localhost:3000
```
Without storage credentials it runs in a try-it-out mode (the banner shows, saves
won't persist). To test real saving locally, create `.env` with your Upstash
`UPSTASH_REDIS_REST_URL` / `UPSTASH_REDIS_REST_TOKEN` (see `.env.example`).

Uses `npm` here for portability; `pnpm`/`yarn` work fine too.

---

## How it works (the short version)

- Each person's browser gets a random id (in `localStorage`) so returning visitors
  edit their own entry instead of creating duplicates — that's the "no login" trick.
- Saving does `HSET trip <id> {name, dates}`. Reading does `HGETALL`. Each person is a
  separate hash field, so two people saving at once never overwrite each other.
- The "best date" is the longest run of consecutive days at the highest overlap count
  (`lib/dates.ts` → `bestWindows`). Day glow is `freeCount / totalPeople`.

## Project layout
```
app/
  layout.tsx               fonts + metadata
  page.tsx                 reads initial availability, renders the planner
  globals.css              the Quando design system
  api/availability/route.ts  GET all / POST one person's dates
components/Planner.tsx      the interactive calendar (client)
lib/
  trip.ts                  your trip config — edit this
  dates.ts                 pure date + best-window helpers
  redis.ts                 storage client (Upstash or legacy KV env names)
  types.ts
```
