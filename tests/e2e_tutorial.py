#Tutorial, Pip, Guild Master tier, and quest brief (FR-46 and CR-01 additions). Needs a fresh database with the
#seeded faculty@cit.edu / ChangeMe-12345, the app on localhost:3000, local psql access, and Playwright with Chromium.
#Run: python tests/e2e_tutorial.py
import re, subprocess, sys
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

with sync_playwright() as p:
    br = p.chromium.launch()
    def ctx(w=1280, h=900):
        return br.new_context(viewport={"width": w, "height": h}).new_page()

    #Sign-in page greets with Pip
    fac = ctx()
    fac.goto(BASE + "/signin")
    check("Bit waves on the sign-in page", fac.get_by_label("Bit the slime").count() >= 1)
    fac.screenshot(path=f"{SHOTS}/t01-signin.png")
    fac.fill("#email", "faculty@cit.edu"); fac.fill("#password", "ChangeMe-12345")
    fac.click("button[type=submit]"); fac.wait_for_url("**/consent")
    fac.click("text=I agree, continue"); fac.wait_for_url("**/faculty/quests")

    #Faculty tour
    fac.wait_for_selector("[data-testid=tour]")
    check("faculty tour opens on first visit", fac.get_by_role("dialog").is_visible())
    check("faculty is greeted as Guild Master", "Guild Master" in fac.inner_text("#tour-title"))
    fac.screenshot(path=f"{SHOTS}/t02-faculty-tour.png")
    fac.keyboard.press("Escape")
    fac.wait_for_selector("[data-testid=tour]", state="detached")
    check("Escape closes the tour", fac.locator("[data-testid=tour]").count() == 0)
    fac.wait_for_timeout(500)
    check("closing marks the tour done", sql("select tour_done_at is not null from users where email='faculty@cit.edu'") == "t")
    fac.reload(); fac.wait_for_load_state("networkidle")
    check("tour does not come back after closing", fac.locator("[data-testid=tour]").count() == 0)
    check("faculty header shows Guild Master", fac.locator("header").get_by_text("Guild Master").count() >= 1)

    fac.goto(BASE + "/faculty/users")
    fac.fill("#inv-email", "amy@cit.edu"); fac.click("text=Create invitation"); fac.wait_for_selector("text=Invitation created")
    code_amy = re.search(r"GUILD-\w{5}-\w{5}", fac.inner_text("[role=status]")).group(0)
    fac.goto(BASE + "/faculty/users")
    fac.fill("#inv-email", "ben@cit.edu"); fac.click("text=Create invitation"); fac.wait_for_selector("text=Invitation created")
    code_ben = re.search(r"GUILD-\w{5}-\w{5}", fac.inner_text("[role=status]")).group(0)

    def register(code, name, email, w=1280, h=900):
        pg = ctx(w, h)
        pg.goto(f"{BASE}/register?code={code}")
        pg.fill("#name", name); pg.fill("#email", email); pg.fill("#password", "Password-123")
        pg.click("button[type=submit]"); pg.wait_for_url("**/consent")
        pg.click("text=I agree, continue"); pg.wait_for_url("**/quests")
        return pg

    #Student tour: walk every step with Next
    amy = register(code_amy, "Amy Reyes", "amy@cit.edu")
    amy.wait_for_selector("[data-testid=tour]")
    check("student tour opens on first visit", amy.inner_text("#tour-title").startswith("Hi"))
    total = int(re.search(r"of (\d+)", amy.inner_text("[role=dialog]")).group(1))
    titles = []
    for n in range(total - 1):
        titles.append(amy.inner_text("#tour-title"))
        if n == 2:
            amy.screenshot(path=f"{SHOTS}/t03-student-tour-card.png")
        amy.get_by_role("button", name="Next").click()
        amy.wait_for_timeout(350)
    check("tour has a step for the adventurer card", any("adventurer" in t.lower() for t in titles))
    amy.get_by_role("button", name="Back").click(); amy.wait_for_timeout(200)
    back_ok = "Notifications" in amy.inner_text("#tour-title")
    amy.get_by_role("button", name="Next").click(); amy.wait_for_timeout(200)
    check("Back goes to the previous step", back_ok)
    check("last step offers the Training Grounds", amy.get_by_role("link", name="Go to Training Grounds").is_visible())
    amy.screenshot(path=f"{SHOTS}/t04-student-tour-end.png")
    amy.get_by_role("link", name="Go to Training Grounds").click()
    amy.wait_for_url("**/training")
    check("Training Grounds map opens from the tour", "Training Grounds" in amy.inner_text("h1"))
    check("only level 1 is open at first", amy.locator("a[href='/training/1']").count() == 1 and amy.locator("a[href='/training/2']").count() == 0)
    amy.screenshot(path=f"{SHOTS}/t05-training-map.png", full_page=True)
    amy.goto(BASE + "/training/3"); amy.wait_for_load_state("networkidle")
    check("a locked level sends you back to the map", amy.url.endswith("/training"))

    def practice(n, comment):
        amy.goto(f"{BASE}/training/{n}"); amy.wait_for_load_state("networkidle")
        for crit, sc in zip(["Readability", "Correctness", "Structure"], (3, 3, 3)):
            amy.locator("fieldset").filter(has_text=crit).locator(f"text={sc}").first.click()
        amy.fill("#comment", comment)
        amy.click("text=Submit review"); amy.wait_for_url(f"**/training/{n}?found=*")
        return amy.inner_text("main")

    #Level 1: incomplete review is refused like a real one
    amy.goto(BASE + "/training/1"); amy.wait_for_load_state("networkidle")
    check("practice shows the brief", amy.get_by_text("What this code should do").count() == 1)
    code_lines = amy.locator(".code-editor .line").count()
    check("code view numbers every line (14 lines)", code_lines == 14)
    check("code is coloured by the highlighter", amy.locator(".code-editor pre.shiki span[style*='color']").count() > 5)
    amy.screenshot(path=f"{SHOTS}/t05b-level1.png", full_page=True)
    amy.click("text=Submit review"); amy.wait_for_selector("text=Your review is missing")
    check("practice review needs scores and a comment", True)
    body = practice(1, "A grade of exactly 75 fails because the check uses > instead of >=, but the brief says 75 and up passes.")
    check("level 1 debrief: 1 of 1", "1/1 bug" in body)
    check("level 1 offers the next level", amy.get_by_role("link", name="Next level").count() == 1)

    #Level 2: readability, spacing kept exactly as written
    amy.goto(BASE + "/training/2"); amy.wait_for_load_state("networkidle")
    raw = amy.inner_text(".code-editor")
    check("messy code is shown unformatted", "if(a[i]>=75)c++;}" in raw and "int f(int a[],int b){" in raw)
    body = practice(2, "The names f, a, b and c do not say what they hold. Rename them so a reader understands the function.\nThere is no indentation, so the loop and the if are hard to follow.")
    check("level 2 debrief: 2 of 3 problems", "2/3 problems" in body)
    check("level 2 explains the missed magic numbers", "Magic numbers" in body and "Missed" in body)

    body = practice(3, "The loop uses i <= n, so it reads one element past the end of the array. Also sum / n is integer division, so the decimals are lost before returning a float.")
    check("level 3 debrief counts 2 of 3 bugs", "2/3 bugs" in body)
    check("practice gives no XP", sql("select xp_total from users where email='amy@cit.edu'") == "0")
    check("best scores are stored per level", sql("select training_progress::text from users where email='amy@cit.edu'").replace(" ", "") == '{"1":1,"2":2,"3":2}')
    check("finishing level 3 marks training done", sql("select training_done_at is not null from users where email='amy@cit.edu'") == "t")
    amy.screenshot(path=f"{SHOTS}/t06-debrief.png", full_page=True)
    amy.goto(BASE + "/training"); amy.wait_for_load_state("networkidle")
    check("map shows all three levels cleared", amy.get_by_text("Cleared", exact=True).count() == 3)
    amy.screenshot(path=f"{SHOTS}/t06b-map-done.png", full_page=True)

    amy.goto(BASE + "/quests"); amy.wait_for_load_state("networkidle")
    check("tour stays closed after finishing", amy.locator("[data-testid=tour]").count() == 0)
    check("Training Grounds nudge hides once done", amy.get_by_text("Practice first in the Training Grounds").count() == 0)
    check("sleeping Bit on the empty review list", amy.get_by_text("I'll nap here").count() == 1)

    #Pip cycles tips on click
    tip = amy.locator("[aria-live=polite]").first
    first = tip.inner_text()
    amy.get_by_role("button", name=re.compile("Click for another tip")).first.click()
    amy.wait_for_timeout(200)
    check("clicking Bit shows another tip", amy.locator("[aria-live=polite]").first.inner_text() != first)

    #Replay with the ? button
    amy.get_by_role("link", name="Replay the guided tour").click()
    amy.wait_for_selector("[data-testid=tour]")
    check("? button replays the tour", amy.inner_text("#tour-title").startswith("Hi"))
    amy.get_by_role("button", name="Skip tour").click()
    amy.wait_for_selector("[data-testid=tour]", state="detached")
    amy.wait_for_url(re.compile(r"/quests$"))
    check("skipping a replay clears ?tour=1", amy.url.endswith("/quests"))

    #Submit form needs a brief
    amy.goto(BASE + "/quests/new")
    amy.fill("#title", "Stack push"); amy.fill("#snippet", "void push(Stack *s, int v) { s->items[s->top++] = v; }")
    amy.fill("#context", "short")
    amy.evaluate("document.querySelector('#context').removeAttribute('minlength')")
    amy.check("input[name=confirm]"); amy.click("text=Submit quest")
    amy.wait_for_selector("text=Say in a sentence")
    check("too-short context is refused (server check)", True)
    amy.fill("#context", "Pushes a value on the stack. It should refuse when the stack is full.")
    amy.fill("#notes", "Not sure if I should return an error code or print something.")
    amy.screenshot(path=f"{SHOTS}/t07-brief-form.png", full_page=True)
    amy.check("input[name=confirm]"); amy.click("text=Submit quest")
    amy.wait_for_url("**/quests/*?submitted=*")
    ref = int(re.search(r"/quests/(\d+)", amy.url).group(1))
    check("quest with brief is stored", sql(f"select context is not null and notes is not null from quests where ref_no={ref}") == "t")
    check("brief shows on the quest page", amy.get_by_text("Notes for the reviewer").count() == 1)

    #Reviewer sees the brief; phone width has no sideways scroll on the review page
    ben = register(code_ben, "Ben Cruz", "ben@cit.edu", 390, 844)
    ben.keyboard.press("Escape"); ben.wait_for_timeout(300)
    sql(f"update quests set reviewer_id=(select id from users where email='ben@cit.edu'), status='IN_REVIEW', assigned_at=now() where ref_no={ref} and reviewer_id is null")
    ben.goto(f"{BASE}/quests/{ref}/review"); ben.wait_for_load_state("networkidle")
    check("reviewer sees the submitter's brief", ben.get_by_text("refuse when the stack is full").count() == 1)
    overflow = ben.evaluate("document.documentElement.scrollWidth > window.innerWidth")
    check("review page fits a phone screen", not overflow)
    ben.screenshot(path=f"{SHOTS}/t08-review-phone.png", full_page=True)

    #Guild Hall lists Guild Masters apart from members
    ben.goto(BASE + "/guild"); ben.wait_for_load_state("networkidle")
    check("Guild Hall has a Guild Masters section", ben.get_by_role("heading", name="Guild Masters").count() == 1)
    ben.screenshot(path=f"{SHOTS}/t09-guild-phone.png", full_page=True)

    br.close()

passed = sum(1 for _, ok in results if ok)
print(f"\n{passed}/{len(results)} checks passed")
sys.exit(0 if passed == len(results) else 1)
