#Release 2 and 3 browser test. Needs: a fresh database with only the seeded faculty@cit.edu / ChangeMe-12345,
#the app on localhost:3000 started with CRON_SECRET=testsecret, local psql access, and Playwright with Chromium.
#Run: python tests/e2e_release23.py
import re, subprocess, sys, json, urllib.request
from playwright.sync_api import sync_playwright

BASE = "http://localhost:3000"
SHOTS = "tests/screenshots"
subprocess.run(["mkdir", "-p", SHOTS])
results = []

def check(name, cond):
    results.append((name, bool(cond)))
    print(("PASS " if cond else "FAIL ") + name, flush=True)

def sql(q):
    return subprocess.run(["psql", "-h", "localhost", "-U", "postgres", "guild", "-tAc", q], capture_output=True, text=True).stdout.strip()

def cron(secret="testsecret"):
    req = urllib.request.Request(BASE + "/api/cron/daily", headers={"Authorization": f"Bearer {secret}"})
    try:
        with urllib.request.urlopen(req) as r:
            return r.status, json.loads(r.read())
    except urllib.error.HTTPError as e:
        return e.code, None

def sign_in(page, email, pw):
    page.goto(BASE + "/signin")
    page.fill("#email", email); page.fill("#password", pw)
    page.click("button[type=submit]"); page.wait_for_load_state("networkidle")

def submit_quest(page, title, code):
    page.goto(BASE + "/quests/new")
    page.fill("#title", title); page.fill("#snippet", code)
    page.check("input[name=confirm]"); page.click("text=Submit quest")
    page.wait_for_url("**/quests/*?submitted=*")
    return int(re.search(r"/quests/(\d+)", page.url).group(1))

def review(page, ref, issue="Line 2 never checks for NULL before using the pointer, so an empty list crashes.", scores=(4, 3, 4)):
    page.goto(f"{BASE}/quests/{ref}/review")
    for crit, sc in zip(["Readability", "Correctness", "Structure"], scores):
        page.locator("fieldset").filter(has_text=crit).locator(f"text={sc}").first.click()
    page.fill("#comment", issue)
    page.click("text=Submit review")
    page.wait_for_load_state("networkidle")

with sync_playwright() as p:
    br = p.chromium.launch()
    def ctx():
        return br.new_context(viewport={"width": 1280, "height": 900}).new_page()

    fac = ctx()
    sign_in(fac, "faculty@cit.edu", "ChangeMe-12345")
    fac.click("text=I agree, continue"); fac.wait_for_url("**/faculty/quests")

    codes = {}
    for email, role in [("fac2@cit.edu", "FACULTY"), ("amy@cit.edu", "STUDENT"), ("ben@cit.edu", "STUDENT"), ("cal@cit.edu", "STUDENT")]:
        fac.goto(BASE + "/faculty/users")
        fac.fill("#inv-email", email); fac.select_option("#inv-role", role)
        fac.click("text=Create invitation"); fac.wait_for_selector("text=Invitation created")
        codes[email] = re.search(r"GUILD-\w{5}-\w{5}", fac.inner_text("[role=status]")).group(0)

    pages = {}
    for email, name in [("fac2@cit.edu", "Fe Ramos"), ("amy@cit.edu", "Amy Reyes"), ("ben@cit.edu", "Ben Cruz"), ("cal@cit.edu", "Cal Lim")]:
        pg = ctx()
        pg.goto(f"{BASE}/register?code={codes[email]}")
        pg.fill("#name", name); pg.fill("#email", email); pg.fill("#password", "Password-123")
        pg.click("button[type=submit]"); pg.wait_for_url("**/consent")
        pg.click("text=I agree, continue"); pg.wait_for_load_state("networkidle")
        pages[email] = pg
    fac2, amy, ben, cal = pages["fac2@cit.edu"], pages["amy@cit.edu"], pages["ben@cit.edu"], pages["cal@cit.edu"]
    by_email = {"amy@cit.edu": amy, "ben@cit.edu": ben, "cal@cit.edu": cal}

    #---- Mentor Requests (FR-35 to FR-40)
    q1 = submit_quest(amy, "Linked list insert", "void insert(Node **h, int v) {\n  Node *n = malloc(sizeof *n);\n  n->v = v; n->next = *h; *h = n;\n}")
    check("first quest earns First Quest badge (FR-30)", sql("select count(*) from user_badges b join users u on u.id=b.user_id where u.email='amy@cit.edu' and badge_code='FIRST_QUEST'") == "1")
    peer1 = sql(f"select u.email from quests q join users u on u.id=q.reviewer_id where q.ref_no={q1}")

    amy.goto(f"{BASE}/quests/{q1}")
    amy.click("text=Need a faculty mentor to look at this?")
    amy.fill("#mentor-reason", "Is malloc without a NULL check acceptable here?")
    amy.click("text=Request mentor review"); amy.wait_for_selector("text=Mentor review requested.")
    check("submitter creates mentor request (FR-35)", sql("select status from mentor_requests") == "PENDING")
    check("every faculty member notified (FR-36)", sql("select count(distinct n.user_id) from notifications n join users u on u.id=n.user_id where u.role='FACULTY' and n.message like 'Mentor review requested%'") == "2")
    check("second request on same quest blocked by database", sql(f"insert into mentor_requests (quest_id, reason) select id, 'x' from quests where ref_no={q1} on conflict do nothing returning id").replace('INSERT 0 0', '').strip() == "")

    fac2.goto(BASE + "/faculty/mentor")
    check("pending request listed for faculty (FR-37)", "Is malloc without a NULL check" in fac2.inner_text("main"))
    fac.goto(BASE + "/faculty/mentor")
    check("mentor waiting count in faculty nav", "Mentor requests" in fac.inner_text("header") and "1" in fac.locator("header nav").inner_text())
    fac.click("text=Pick up"); fac.wait_for_url("**/faculty/mentor/*")
    fac2.click("text=Pick up"); fac2.wait_for_load_state("networkidle")
    check("second faculty told it was taken (FR-38)", "picked that request up first" in fac2.inner_text("main"))
    fac2.goto(BASE + "/faculty/mentor")
    check("picked-up request hidden from other faculty (FR-38)", "Is malloc without a NULL check" not in fac2.inner_text("main"))

    amy.goto(f"{BASE}/quests/{q1}")
    check("Resolve hidden while mentor works", "Mark resolved" not in amy.inner_text("main") and "doing a mentor review" in amy.inner_text("main"))

    fac.click("text=Submit review"); fac.wait_for_selector("text=Your review is missing")
    check("mentor review uses the same rubric checks (FR-39)", "readability" in fac.inner_text("[role=alert]"))
    fac.screenshot(path=f"{SHOTS}/r2-mentor-review.png", full_page=True)
    for crit, sc in zip(["Readability", "Correctness", "Structure"], (4, 2, 4)):
        fac.locator("fieldset").filter(has_text=crit).locator(f"text={sc}").first.click()
    fac.fill("#comment", "Always check malloc's return value; on failure, return an error instead of writing through NULL.")
    fac.click("text=Submit review"); fac.wait_for_url(f"**/quests/{q1}?mentored=1")
    check("mentor review completes quest, resolves request (FR-40)", sql(f"select q.status || '/' || m.status from quests q join mentor_requests m on m.quest_id=q.id where q.ref_no={q1}") == "COMPLETED/RESOLVED")
    check("submitter notified of mentor review (FR-40)", sql("select count(*) from notifications n join users u on u.id=n.user_id where u.email='amy@cit.edu' and n.message like 'A faculty mentor reviewed%'") == "1")
    check("peer reviewer told their review is no longer needed", sql(f"select count(*) from notifications n join users u on u.id=n.user_id where u.email='{peer1}' and n.message like '%no longer needed%'") == "1")
    check("faculty earn no XP for mentoring", sql("select xp_total from users where email='faculty@cit.edu'") == "0")
    amy.goto(f"{BASE}/quests/{q1}")
    check("mentor review shown to submitter, labelled", "(faculty mentor)" in amy.inner_text("main") and "Mark resolved" in amy.inner_text("main"))
    amy.screenshot(path=f"{SHOTS}/r2-quest-after-mentor.png", full_page=True)

    #---- Quest Board, Stale, Claim (FR-32 to FR-34)
    q2 = submit_quest(ben, "Bubble sort", "void sort(int *a, int n) { for (int i = 0; i < n; i++) for (int j = 0; j < n - 1; j++) if (a[j] > a[j+1]) { int t = a[j]; a[j] = a[j+1]; a[j+1] = t; } }")
    r2 = sql(f"select u.email from quests q join users u on u.id=q.reviewer_id where q.ref_no={q2}")
    claimer_email = [e for e in by_email if e not in ("ben@cit.edu", r2)][0]
    claimer = by_email[claimer_email]
    claimer.goto(BASE + "/board")
    check("board lists open quests (FR-32)", "Bubble sort" in claimer.inner_text("main") and "Claim and review" not in claimer.inner_text("main"))
    sql(f"update quests set assigned_at = now() - interval '80 hours' where ref_no={q2}")
    claimer.goto(BASE + "/board")
    check("quest over 72 h shows Stale (FR-33)", "Stale" in claimer.inner_text("main"))
    by_email[r2].goto(BASE + "/board")
    check("current reviewer cannot claim own assignment", "Claim and review" not in by_email[r2].inner_text("main"))
    ben.goto(BASE + "/board")
    check("submitter cannot claim own quest (FR-34)", "Claim and review" not in ben.inner_text("main"))
    claimer.screenshot(path=f"{SHOTS}/r3-board.png", full_page=True)
    claimer.click("text=Claim and review"); claimer.wait_for_url(f"**/quests/{q2}/review")
    check("claim makes claimer the reviewer (FR-34)", sql(f"select u.email from quests q join users u on u.id=q.reviewer_id where q.ref_no={q2}") == claimer_email)
    check("claim recorded as CLAIMED reassignment", sql("select reason from reassignments") == "CLAIMED")
    check("previous reviewer notified (FR-34)", sql(f"select count(*) from notifications n join users u on u.id=n.user_id where u.email='{r2}' and n.message like '%claimed it%'") == "1")
    by_email[r2].goto(f"{BASE}/quests/{q2}")
    check("previous reviewer loses access to the code", "could not be found" in by_email[r2].content().lower() or "404" in by_email[r2].content())
    review(claimer, q2)
    check("claimer review completes the quest", sql(f"select status from quests where ref_no={q2}") == "COMPLETED")
    check("first review earns First Review badge", sql(f"select count(*) from user_badges b join users u on u.id=b.user_id where u.email='{claimer_email}' and badge_code='FIRST_REVIEW'") == "1")

    #---- Daily job: overdue reassignment (FR-15) and streaks (FR-29)
    check("daily job refuses a wrong secret", cron("nope")[0] == 401)
    q3 = submit_quest(cal, "String reverse", "void rev(char *s) { int n = strlen(s); for (int i = 0; i < n / 2; i++) { char t = s[i]; s[i] = s[n-1-i]; s[n-1-i] = t; } }")
    r3 = sql(f"select u.email from quests q join users u on u.id=q.reviewer_id where q.ref_no={q3}")
    sql(f"update quests set assigned_at = now() - interval '8 days' where ref_no={q3}")
    status, body = cron()
    check(f"daily job reassigns 7-day overdue review (FR-15) {body}", status == 200 and body["reassigned"] == 1)
    new_r3 = sql(f"select u.email from quests q join users u on u.id=q.reviewer_id where q.ref_no={q3}")
    check("overdue quest moved to a different student, not the submitter", new_r3 not in (r3, "cal@cit.edu"))
    check("old reviewer notified of overdue reassignment", sql(f"select count(*) from notifications n join users u on u.id=n.user_id where u.email='{r3}' and n.message like '%7 days overdue%'") == "1")
    status, body = cron()
    check("second daily run reassigns nothing (NFR-09)", body["reassigned"] == 0)

    #Streaks: move this week's activity into last week, then re-run the weekly step
    sql("update users set streak = 0, streak_week = null")
    sql("update reviews set created_at = created_at - interval '7 days'")
    sql("update reassignments set created_at = created_at - interval '7 days'")
    cron()
    streak = lambda e: sql(f"select streak from users where email='{e}'")
    check(f"student who reviewed and missed nothing gets streak 1 ({claimer_email}={streak(claimer_email)})", streak(claimer_email) == "1" if claimer_email not in (r2, r3) else True)
    check(f"student with a missed review is reset to 0 ({r3}={streak(r3)})", streak(r3) == "0")
    sql("update users set streak = 2 where email='" + claimer_email + "'")
    cron()
    check("weekly step runs once per week only (NFR-09)", streak(claimer_email) == "2")
    sql(f"update users set streak = 3, streak_week = null where email='{claimer_email}'")
    sql("update reviews set created_at = created_at - interval '7 days'")
    cron()
    check("3-week streak earns badge (BRL-06)", sql(f"select count(*) from user_badges b join users u on u.id=b.user_id where u.email='{claimer_email}' and badge_code='STREAK_3'") == "1")

    #---- Guild Hall (FR-31)
    amy.goto(BASE + "/guild")
    names = [n.replace(" (you)", "").strip() for n in amy.locator("main li span.truncate").all_inner_texts()]
    check(f"Guild Hall alphabetical, not a leaderboard {names}", names == sorted(names))
    amy.goto(BASE + "/profile"); amy.wait_for_url("**/guild/*")
    t = amy.inner_text("main")
    check("own profile shows badges, streak, XP history (FR-31)", "First Quest" in t and "Review streak" in t and "Recent XP" in t)
    amy.screenshot(path=f"{SHOTS}/r3-profile-self.png", full_page=True)
    cid = sql(f"select id from users where email='{claimer_email}'")
    amy.goto(f"{BASE}/guild/{cid}")
    t = amy.inner_text("main")
    check("other profile shows stats but not their XP log", "Reviews done" in t and "Recent XP" not in t)
    check("other profile hides links to quests the viewer is not in (BRL-10)", amy.locator(f"main a[href='/quests/{q2}']").count() == 0)

    #---- Faculty filters, dashboard, export (FR-41 to FR-45)
    fac.goto(BASE + "/faculty/quests?status=COMPLETED")
    t = fac.inner_text("main")
    check("status filter (FR-41)", "Linked list insert" in t and "String reverse" not in t)
    fac.goto(BASE + "/faculty/quests?q=amy")
    check("search by person (FR-41)", "Linked list insert" in fac.inner_text("main") and "Bubble sort" not in fac.inner_text("main"))
    fac.goto(BASE + "/faculty/dashboard")
    t = fac.inner_text("main")
    check("dashboard shows median turnaround (FR-42)", "Median time to first review" in t and "across 2 reviewed quests" in t)
    check("dashboard lists every student (FR-43)", all(n in t for n in ["Amy Reyes", "Ben Cruz", "Cal Lim"]))
    check("weekly chart present with table view (FR-44)", "Quests submitted per week" in t and fac.locator("details summary", has_text="Show as a table").count() == 1)
    fac.screenshot(path=f"{SHOTS}/r2-dashboard.png", full_page=True)
    with fac.expect_download() as dl:
        fac.click("text=Download CSV")
    csv = open(dl.value.path(), encoding="utf-8-sig").read()
    check("CSV has a row per quest (FR-45)", len(csv.strip().splitlines()) == 4)
    check("CSV uses codes, never names (BRL-10)", not any(n in csv for n in ["Amy", "Ben", "Cal", "Reyes", "cit.edu"]) and "S01" in csv)
    check("export written to audit log", sql("select count(*) from audit_logs where action='EXPORT'") == "1")
    r = amy.request.get(BASE + "/api/faculty/export")
    check("students cannot export (403)", r.status == 403)
    amy.goto(BASE + "/faculty/dashboard")
    check("students blocked from dashboard", "/forbidden" in amy.url)

    #---- Phone width
    m = br.new_context(viewport={"width": 360, "height": 780}, storage_state=fac.context.storage_state()).new_page()
    for path in ["/faculty/dashboard", "/faculty/mentor", "/faculty/quests", "/guild"]:
        m.goto(BASE + path)
        w = m.evaluate("document.documentElement.scrollWidth")
        check(f"no sideways scroll at 360px on {path} ({w})", w <= 360)
    m.goto(BASE + "/faculty/dashboard"); m.screenshot(path=f"{SHOTS}/r2-dashboard-phone.png", full_page=True)
    m2 = br.new_context(viewport={"width": 360, "height": 780}, storage_state=amy.context.storage_state()).new_page()
    for path in ["/board", f"/guild/{cid}", f"/quests/{q1}"]:
        m2.goto(BASE + path)
        w = m2.evaluate("document.documentElement.scrollWidth")
        check(f"no sideways scroll at 360px on {path} ({w})", w <= 360)
    br.close()

failed = [n for n, ok in results if not ok]
print(f"\n{len(results) - len(failed)}/{len(results)} passed")
for f in failed: print("  FAILED:", f)
sys.exit(1 if failed else 0)
