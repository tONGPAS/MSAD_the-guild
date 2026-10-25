# The Guild (Peer Code Review Queue)

CPE340 MSAD project for the Department of Computer Engineering, CIT-U. Students submit code ("quests"), the system assigns one classmate to review it in turn, the reviewer scores it on a rubric, and both earn XP. Faculty invite members and watch the activity.

Built against **SRS v1.0 (October 23, 2026)**. This is **Release 1 (Core Flow)** from SRS Section 11, plus XP and rank from Release 3 because they were cheap to add.

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
2. Open **Project Settings > Database > Connection string**.
   - Copy the **Transaction pooler** string (port `6543`). This is your `DATABASE_URL`.
   - Copy the **Session pooler** string (port `5432`). This is your `DIRECT_URL`.
   - Replace `[YOUR-PASSWORD]` in both with your database password.
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
2. In **Settings > Environment Variables**, add `DATABASE_URL`, `DIRECT_URL`, and (if used) `SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY`. The `SEED_*` values are not needed there.
3. Deploy. Migrations are run from your laptop (`npm run db:migrate`), not by Vercel.

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
    progression/            M04: XP and rank
    notifications/          In-app notifications (SR-04)
  app/
    (public)/               SC-01 Register, SC-02 Sign in
    consent/                Privacy notice (FR-07)
    (app)/quests/           SC-03 New quest, SC-04 My quests, SC-05 Review form, SC-06 Quest detail
    (app)/faculty/          SC-11 Members, early FR-41 All quests
    (app)/profile/          Early SC-08 (own XP and rank)
```

Each module's `actions.ts` is what the pages call. Every action checks the user's session and role on the server first (SEC-04), so hiding a button is never the only protection.

## Requirement coverage

**Done and tested end to end:** FR-01 to FR-14, FR-16 to FR-28, NFR-02, NFR-03, NFR-04, NFR-08, NFR-13 (quest visibility), NFR-14 (360 px), SEC-01 to SEC-09, SR-04, SR-05, SR-06, SR-07.

Acceptance criteria exercised by the browser test: AC-01, AC-02, AC-03, AC-04, AC-05, AC-06, AC-07, AC-15, plus FR-05 session ending and FR-10 confirmation.

**Not built yet:**

| Release | Requirements |
|---|---|
| 2 (Dec 4) | FR-35 to FR-40 Mentor Requests, FR-42 to FR-44 dashboard, FR-41 filters |
| 3 (Dec 9) | FR-15 reassignment, FR-29 streaks, FR-30 badges, FR-31 other profiles, FR-32 to FR-34 Quest Board, FR-45 export, SR-03 daily job |

The tables for these already exist, so later releases add code, not schema rewrites.

## Decisions worth knowing

- **Round-robin (FR-12):** the eligible Student whose last assignment is oldest goes next; new members go first. A Postgres advisory lock makes two simultaneous submissions take turns, so they cannot grab the same reviewer.
- **Quests with nobody eligible** stay Pending and get assigned automatically the moment a new Student accepts the privacy notice.
- **XP can never be paid twice** for the same action on the same quest or review (unique index on `xp_events`).
- **A comment left in the text box without clicking Add** is still included when the review is submitted.
- **Reviewer names are shown to submitters.** The SC-06 wireframe shows "Guildmate #7"; we chose real names to keep the person-to-person spirit. Change this before UAT if the instructor prefers anonymity.
- **Invitations can be for Faculty too**, so a second instructor can join (AS-02).
- **Privacy notice wording** in `src/app/consent/page.tsx` is a draft. Have the instructor confirm it before the pilot.
