# The Guild (Peer Code Review Queue)

CPE340 MSAD project for the Department of Computer Engineering, CIT-U. Students submit code ("quests"), the system assigns one classmate to review it in turn, the reviewer scores it on a rubric, and both earn XP. Faculty invite members and watch the activity.

Built against **SRS v1.0 (October 23, 2026)** plus change request **CR-01** (pilot of 5 students and 1 faculty, daily submit-XP cap, first-run guidance). **Releases 1 to 3 from SRS Section 11 are built.** Release 4 is the pilot and UAT itself.

## Stack

| Part | Choice | Why |
|---|---|---|
| Web framework | Next.js 16 (App Router, server actions) | Pages and server logic in one project |
| Database | PostgreSQL on Supabase (free tier) | Managed relational DB (EI-05, CON-01) |
| Database access | Drizzle ORM | Pure TypeScript, readable SQL migrations in `drizzle/` |
| Login | Email + password, bcrypt hashes, server-side sessions | Exactly what FR-02, NFR-03, NFR-04 specify |
| Attachments | Supabase Storage, private bucket | SR-07: files outside the database |
| Hosting | Vercel (free tier) | HTTPS by default (EI-07) |

## First-time setup (do this once)

You need Node.js 20 or newer.

### 1. Create the Supabase project

1. Go to [supabase.com](https://supabase.com), create a project. Pick the **Southeast Asia (Singapore)** region so it is close to Cebu. Save the database password somewhere safe.
2. Click the **Connect** button in the top bar of your project page. In the dialog:
   - Copy the **Transaction pooler** string (port `6543`). This is your `DATABASE_URL`.
   - Copy the **Session pooler** string (port `5432`). This is your `DIRECT_URL`.
   - Replace `[YOUR-PASSWORD]` in both with your database password. If the password has `@ # / ? %` in it, percent-encode those characters (`@` is `%40`) or reset the password to letters and numbers only.
   - Skip "Direct connection": it needs IPv6, which many home and campus networks lack.
3. (Optional, for screenshots on quests) Open **Storage**, create a bucket named exactly `attachments`, and leave it **private**. Then from **Project Settings > API** copy the Project URL (`SUPABASE_URL`) and the `service_role` key (`SUPABASE_SERVICE_ROLE_KEY`). Never put the service role key in frontend code or commit it.

### 2. Configure and run locally

```bash
npm install
cp .env.example .env        #then fill in the values from step 1
npm run db:migrate          #creates all 12 tables
npm run db:seed             #creates the first Faculty account from SEED_FACULTY_*
npm run dev                 #open http://localhost:3000
```

Sign in with the seeded Faculty account, go to **Members**, and invite yourself and your teammate as Students.

### 3. Deploy to Vercel

1. Push this repo to GitHub, then **Import Project** on [vercel.com](https://vercel.com).
2. In **Settings > Environment Variables**, add `DATABASE_URL` and (if used) `SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY`. Also add `CRON_SECRET` set to any long random text, so only Vercel can run the daily job. The `SEED_*` and `DIRECT_URL` values are not needed there.
3. Deploy. Migrations are run from your laptop (`npm run db:migrate`), not by Vercel.

The live app connects as `guild_app`, a database login that can read and write the app's tables but cannot create or drop them. Migrations use the main `postgres` login (`DIRECT_URL`). A new table needs `GRANT SELECT, INSERT, UPDATE, DELETE ON <table> TO guild_app;` in its migration.

### The daily job

`vercel.json` makes Vercel call `/api/cron/daily` once a day (09:17 Philippine time). It reassigns reviews 7 days overdue (FR-15), updates streaks once per week (FR-29), clears expired sessions, and keeps Supabase from pausing the database (free projects pause after 7 quiet days, which took the site down once). Every step is safe to run twice (NFR-09). To run it by hand: `curl -H "Authorization: Bearer $CRON_SECRET" https://<your-site>/api/cron/daily`.

## Changing the database

1. Edit `src/db/schema.ts`.
2. `npm run db:generate -- --name short_description` writes a new SQL file in `drizzle/`. Read it before applying.
3. `npm run db:migrate` applies it. Commit the SQL file so your teammate gets the same change.

`npm run db:studio` opens a browser view of your tables, handy for checking test data.

## Where things live (module map, NFR-11)

```
src/
  db/schema.ts              Section 7 data model, one table per entity
  lib/rules.ts              Every business-rule number (XP, ranks, timeouts, limits)
  modules/
    auth/                   M01: invitations, registration, sign-in, sessions, consent
    quests/                 M02: submission, round-robin assignment, lists, GitHub lookup, attachments
    reviews/                M03: rubric review, replies, helpful rating, resolve
    progression/            M04: XP, rank, badges, weekly streaks, Guild Hall profiles
    mentor/                 M05: Mentor Requests, from request to faculty review
    dashboard/              M06: turnaround, reviews per student, weekly counts, coded CSV
    notifications/          In-app notifications (SR-04)
  app/
    (public)/               SC-01 Register, SC-02 Sign in
    consent/                Privacy notice (FR-07)
    (app)/quests/           SC-03 New quest, SC-04 My quests, SC-05 Review form, SC-06 Quest detail
    (app)/board/            SC-07 Quest Board, Stale, Claim
    (app)/guild/            SC-08 Guild Hall directory and profiles
    (app)/faculty/mentor/   SC-09 Mentor Requests
    (app)/faculty/dashboard SC-10 Faculty Dashboard
    (app)/faculty/          SC-11 Members, FR-41 All quests with filters
    api/cron/daily          SR-03 daily job
    api/faculty/export      FR-45 CSV export
```

Each module's `actions.ts` is what the pages call. Every action checks the user's session and role on the server first (SEC-04), so hiding a button is never the only protection.

## Requirement coverage

**Built and tested end to end:** FR-01 to FR-45, plus the CR-01 submit-XP cap. NFR-02 to NFR-04, NFR-08, NFR-09, NFR-13, NFR-14 (360 px), SEC-01 to SEC-09, SR-03 to SR-07.

**Not built yet:** FR-46 first-run guidance (CR-01) and the visual design pass. Both are planned before UAT. NFR-01, NFR-05 to NFR-07, NFR-10 to NFR-12 are proven during hardening and UAT rather than by code.

### Tests

Two browser test suites, each run on a fresh local database with only the seeded faculty account:

- `tests/e2e.py`, 29 checks: the core loop (AC-01 to AC-07, AC-15)
- `tests/e2e_release23.py`, 55 checks: Mentor Requests, Quest Board, Stale and Claim, the daily job, streaks, badges, profiles, the dashboard, CSV export, and phone width

## Decisions worth knowing

- **Round-robin (FR-12):** the eligible Student whose last assignment is oldest goes next; new members go first. A Postgres advisory lock makes two simultaneous submissions take turns, so they cannot grab the same reviewer.
- **Quests with nobody eligible** stay Pending and get assigned automatically the moment a new Student accepts the privacy notice.
- **XP can never be paid twice** for the same action on the same quest or review (unique index on `xp_events`).
- **A comment left in the text box without clicking Add** is still included when the review is submitted.
- **Reviewer names are shown to submitters.** The SC-06 wireframe shows "Guildmate #7"; we chose real names to keep the person-to-person spirit. Change this before UAT if the instructor prefers anonymity.
- **Invitations can be for Faculty too**, so a second instructor can join (AS-02).
- **Missed review (streaks, FR-29):** a review taken away from you, either reassigned after 7 days or claimed by a classmate after 72 hours. A week with nothing assigned leaves a streak unchanged, so nobody loses one just for not being picked.
- **Stale is live:** a quest shows Stale the moment it passes 72 hours, not at the next daily run.
- **Guild Hall is alphabetical, not ranked.** Leaderboards are out of scope in SRS 1.4.
- **A mentor review ends the peer reviewer's turn** if the quest was still In Review. That does not count as a missed review. Resolve is hidden while a mentor request is open.
- **Faculty earn no XP.** Mentor reviews can be rated helpful, but only peer reviews pay XP.
- **The CSV export** has one row per quest with codes (S01, F01) in place of names, comment word counts for OBJ3, and turnaround hours for OBJ2. Every export is written to the audit log.
- **Privacy notice wording** in `src/app/consent/page.tsx` is a draft. Have the instructor confirm it before the pilot.
