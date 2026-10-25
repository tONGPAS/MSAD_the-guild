#Release 1 browser test. Needs: a fresh database with only the seeded faculty@cit.edu / ChangeMe-12345 account,
#the app running on localhost:3000, local psql access, and: pip install playwright && playwright install chromium
#Run: python tests/e2e.py
import re, sys, subprocess
from playwright.sync_api import sync_playwright, expect

BASE = "http://localhost:3000"
SHOTS = "tests/screenshots"
subprocess.run(["mkdir", "-p", SHOTS])
results = []

def check(name, cond):
    results.append((name, bool(cond)))
    print(("PASS " if cond else "FAIL ") + name, flush=True)

def sql(q):
    return subprocess.run(["psql", "-h", "localhost", "-U", "postgres", "guild", "-tAc", q], capture_output=True, text=True).stdout.strip()

def sign_in(page, email, pw):
    page.goto(BASE + "/signin")
    page.fill("#email", email)
    page.fill("#password", pw)
    page.click("button[type=submit]")
    page.wait_for_load_state("networkidle")

with sync_playwright() as p:
    br = p.chromium.launch()
    fac_ctx = br.new_context(viewport={"width": 1280, "height": 900})
    fac = fac_ctx.new_page()

    #AC-03 no session -> sign in
    fac.goto(BASE + "/quests")
    check("no session redirects to sign-in", fac.url.endswith("/signin"))

    sign_in(fac, "faculty@cit.edu", "ChangeMe-12345")
    check("faculty first sign-in shows privacy notice (FR-07)", "/consent" in fac.url)
    fac.screenshot(path=f"{SHOTS}/01-consent.png", full_page=True)
    fac.click("text=I agree, continue")
    fac.wait_for_url("**/faculty/quests")
    check("faculty lands on All quests", "/faculty/quests" in fac.url)

    codes = {}
    for email in ["amy@cit.edu", "ben@cit.edu", "cal@cit.edu"]:
        fac.goto(BASE + "/faculty/users")
        fac.fill("#inv-email", email)
        fac.click("text=Create invitation")
        fac.wait_for_selector("text=Invitation code created")
        codes[email] = re.search(r"GUILD-\w{5}-\w{5}", fac.inner_text("[role=status]")).group(0)
    check("three invitation codes issued (FR-04)", len(codes) == 3)
    fac.screenshot(path=f"{SHOTS}/02-members.png", full_page=True)

    #UC-02 2a: existing account gets no code
    fac.fill("#inv-email", "faculty@cit.edu")
    fac.click("text=Create invitation")
    fac.wait_for_selector("text=already has an account")
    check("invite refused for existing account", True)

    students = {}
    for email, name in [("amy@cit.edu", "Amy Reyes"), ("ben@cit.edu", "Ben Cruz"), ("cal@cit.edu", "Cal Lim")]:
        ctx = br.new_context(viewport={"width": 1280, "height": 900})
        pg = ctx.new_page()
        pg.goto(BASE + f"/register?code={codes[email]}")
        pg.fill("#name", name)
        pg.fill("#email", email)
        pg.fill("#password", "Password-123")
        pg.click("button[type=submit]")
        pg.wait_for_url("**/consent")
        pg.click("text=I agree, continue")
        pg.wait_for_url("**/quests")
        students[email] = pg

    check("three students registered and consented", len(students) == 3)

    #AC-01: code cannot be reused
    ctx = br.new_context()
    pg = ctx.new_page()
    pg.goto(BASE + f"/register?code={codes['amy@cit.edu']}")
    pg.fill("#name", "Again"); pg.fill("#email", "amy@cit.edu"); pg.fill("#password", "Password-123")
    pg.click("button[type=submit]")
    pg.wait_for_selector("text=already used")
    check("used invitation code is rejected (AC-01)", True)
    ctx.close()

    amy, ben, cal = students["amy@cit.edu"], students["ben@cit.edu"], students["cal@cit.edu"]

    #FR-10: confirmation required
    amy.goto(BASE + "/quests/new")
    amy.fill("#title", "Queue using linked list")
    amy.fill("#snippet", "void enqueue(Queue *q, int v) {\n  Node *n = malloc(sizeof(Node));\n  n->v = v; n->next = NULL;\n  q->tail->next = n;\n  q->tail = n;\n}")
    amy.evaluate("document.querySelector('input[name=confirm]').required=false")
    amy.click("text=Submit quest")
    amy.wait_for_selector("text=not graded or confidential.", state="attached")
    check("quest without not-graded confirmation is rejected (FR-10)", "/quests/new" in amy.url and "Confirm that" in amy.content())

    amy.check("input[name=confirm]")
    amy.screenshot(path=f"{SHOTS}/03-new-quest.png", full_page=True)
    amy.click("text=Submit quest")
    amy.wait_for_url("**/quests/*?submitted=1")
    body = amy.inner_text("main")
    check("quest submitted and assigned (AC-04)", "has been assigned to review it" in body)
    check("submitter is not the reviewer (FR-13)", "Reviewer: Amy" not in body and "Reviewer: you" not in body)
    amy.screenshot(path=f"{SHOTS}/04-quest-submitted.png", full_page=True)
    q1_reviewer = sql("select u.email from quests q join users u on u.id=q.reviewer_id where q.ref_no=1")
    print("quest 1 reviewer:", q1_reviewer)

    #Second quest from Ben: round-robin should not reuse the reviewer who just got one if others are free
    ben.goto(BASE + "/quests/new")
    ben.fill("#title", "Bubble sort with early exit")
    ben.fill("#link", "https://github.com/octocat/Hello-World/pull/1")
    ben.check("input[name=confirm]")
    ben.click("text=Submit quest")
    ben.wait_for_url("**/quests/*?submitted=1")
    q2_reviewer = sql("select u.email from quests q join users u on u.id=q.reviewer_id where q.ref_no=2")
    print("quest 2 reviewer:", q2_reviewer)
    check("round-robin gives quest 2 to a different reviewer (FR-12)", q2_reviewer and q2_reviewer != q1_reviewer and q2_reviewer != "ben@cit.edu")

    reviewer = students[q1_reviewer]
    reviewer.goto(BASE + "/quests")
    check("assignment appears in reviewer's list (AC-15)", "Queue using linked list" in reviewer.inner_text("main"))
    reviewer.goto(BASE + "/notifications")
    check("reviewer notified (FR-14)", "New quest to review" in reviewer.inner_text("main"))

    #AC-03 student on faculty page
    reviewer.goto(BASE + "/faculty/users")
    check("student blocked from faculty page (AC-03)", "/forbidden" in reviewer.url)

    #BRL-10 outsider cannot see quest
    outsider = [s for e, s in students.items() if e not in (q1_reviewer, "amy@cit.edu")][0]
    outsider.goto(BASE + "/quests/1")
    check("non-participant gets 404 on quest (NFR-13)", "could not be found" in outsider.content().lower() or "404" in outsider.content())

    #AC-05 incomplete review
    reviewer.goto(BASE + "/quests/1/review")
    reviewer.locator("fieldset").filter(has_text="Readability").locator("text=4").click()
    reviewer.click("text=Submit review")
    reviewer.wait_for_selector("text=Your review is missing")
    missing = reviewer.inner_text("[role=alert]")
    check("incomplete review rejected with list (AC-05)", "correctness" in missing and "structure" in missing and "comment" in missing)

    reviewer.locator("fieldset").filter(has_text="Correctness").locator("text=3").click()
    reviewer.locator("fieldset").filter(has_text="Structure").locator("text=4").click()
    reviewer.fill("#comment", "Line 4: q->tail is NULL when the queue is empty, so the first enqueue will crash. Check for an empty queue and set head too.")
    reviewer.click("text=Add issue")
    reviewer.click("[role=radio]:has-text('Praise')")
    reviewer.fill("#comment", "Clear names and small scope, easy to follow.")
    reviewer.screenshot(path=f"{SHOTS}/05-review-form.png", full_page=True)
    reviewer.click("text=Submit review")
    reviewer.wait_for_url("**/quests/1?reviewed=1")
    check("review saved, quest Completed (AC-06)", sql("select status from quests where ref_no=1") == "COMPLETED")
    check("unadded text box comment was kept", sql("select count(*) from comments") == "2")

    #AC-07 resolve flow
    amy.goto(BASE + "/quests/1")
    amy.fill("input[name=body]", "Good catch, fixed in the next commit.")
    amy.click("button:has-text('Reply')")
    amy.wait_for_selector("text=Good catch, fixed")
    amy.click("button:has-text('Helpful')")
    amy.wait_for_selector("text=You rated this review helpful")
    amy.screenshot(path=f"{SHOTS}/06-quest-detail.png", full_page=True)
    amy.click("text=Mark resolved")
    amy.wait_for_selector("text=Moved to Resolved")
    check("quest Resolved by submitter (AC-07)", sql("select status from quests where ref_no=1") == "RESOLVED")
    reviewer.goto(BASE + "/quests/1")
    check("reply visible to reviewer (AC-07)", "Good catch, fixed" in reviewer.inner_text("main"))

    amy_xp = sql("select xp_total from users where email='amy@cit.edu'")
    rev_xp = sql(f"select xp_total from users where email='{q1_reviewer}'")
    check(f"submitter XP 10+10=20 (got {amy_xp})", amy_xp == "20")
    check(f"reviewer XP 25+15+10=50 (also submitted quest 2) (got {rev_xp})", rev_xp == "50")
    check("history has every status change (FR-26)", sql("select count(*) from status_logs s join quests q on q.id=s.quest_id where q.ref_no=1") == "4")

    reviewer.goto(BASE + "/profile")
    reviewer.screenshot(path=f"{SHOTS}/07-profile.png", full_page=True)

    #Mobile 360px check (NFR-14)
    m = br.new_context(viewport={"width": 360, "height": 780}, storage_state=amy.context.storage_state())
    mp = m.new_page()
    for path, name in [("/quests", "m-quests"), ("/quests/1", "m-detail"), ("/quests/new", "m-new")]:
        mp.goto(BASE + path)
        sw = mp.evaluate("document.documentElement.scrollWidth")
        check(f"no horizontal scroll at 360px on {path} (width {sw})", sw <= 360)
        mp.screenshot(path=f"{SHOTS}/{name}.png", full_page=True)

    #AC-02 lockout
    ctx = br.new_context()
    pg = ctx.new_page()
    for i in range(5):
        sign_in(pg, "cal@cit.edu", "wrong-pass")
    check("5th failure locks account (NFR-03)", "locked" in pg.inner_text("main"))
    sign_in(pg, "cal@cit.edu", "Password-123")
    check("correct password refused while locked (AC-02)", "locked" in pg.inner_text("main") and "/signin" in pg.url)
    ctx.close()

    #FR-05 deactivation ends sessions
    sql("update users set locked_until=null where email='cal@cit.edu'")
    fac.goto(BASE + "/faculty/users")
    fac.locator("li", has_text="cal@cit.edu").locator("button:has-text('Deactivate')").click()
    fac.wait_for_timeout(800)
    cal.goto(BASE + "/quests")
    check("deactivated user's session ended (FR-05)", "/signin" in cal.url)

    fac.goto(BASE + "/faculty/quests")
    fac.screenshot(path=f"{SHOTS}/08-faculty-quests.png", full_page=True)
    br.close()

failed = [n for n, ok in results if not ok]
print(f"\n{len(results) - len(failed)}/{len(results)} passed")
sys.exit(1 if failed else 0)
