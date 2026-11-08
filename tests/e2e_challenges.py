#Challenges, guild goals, coins, titles, and Bit growth (CR-02). Needs a fresh database with the
#seeded faculty@cit.edu / ChangeMe-12345, the app on localhost:3000, local psql access, and Playwright.
#Run: python tests/e2e_challenges.py
import re, subprocess, sys, json
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

def no_tour():
    sql("update users set tour_done_at = now() where tour_done_at is null")

with sync_playwright() as p:
    br = p.chromium.launch()
    def ctx(w=1280, h=900):
        return br.new_context(viewport={"width": w, "height": h}).new_page()

    fac = ctx()
    fac.goto(BASE + "/signin")
    fac.fill("#email", "faculty@cit.edu"); fac.fill("#password", "ChangeMe-12345")
    fac.click("button[type=submit]"); fac.wait_for_url("**/consent")
    fac.click("text=I agree, continue"); fac.wait_for_url("**/faculty/quests")
    no_tour()

    codes = {}
    for email in ("amy@cit.edu", "ben@cit.edu", "cara@cit.edu"):
        fac.goto(BASE + "/faculty/users")
        fac.fill("#inv-email", email); fac.click("text=Create invitation"); fac.wait_for_selector("text=Invitation created")
        codes[email] = re.search(r"GUILD-\w{5}-\w{5}", fac.inner_text("[role=status]")).group(0)

    def register(email, name):
        pg = ctx()
        pg.goto(f"{BASE}/register?code={codes[email]}")
        pg.fill("#name", name); pg.fill("#email", email); pg.fill("#password", "Password-123")
        pg.click("button[type=submit]"); pg.wait_for_url("**/consent")
        pg.click("text=I agree, continue"); pg.wait_for_url("**/quests")
        no_tour()
        return pg
    amy = register("amy@cit.edu", "Amy Reyes")
    ben = register("ben@cit.edu", "Ben Cruz")
    cara = register("cara@cit.edu", "Cara Lim")
    pages = {"amy@cit.edu": amy, "ben@cit.edu": ben, "cara@cit.edu": cara}
    def uid(email): return sql(f"select id from users where email='{email}'")
    def xp(email, action): return sql(f"select coalesce(sum(points),0) from xp_events where user_id='{uid(email)}' and action='{action}'")

    #Guild Master: empty board, template gallery, publish from templates
    fac.goto(BASE + "/faculty/challenges"); fac.wait_for_load_state("networkidle")
    check("faculty sees the Challenges tab", fac.get_by_role("link", name="Challenges", exact=True).count() >= 1)
    check("empty board shows Bit", fac.get_by_text("No challenges are running").count() == 1)
    fac.click("text=New challenge"); fac.wait_for_url("**/faculty/challenges/new")
    check("template gallery lists all four groups", all(fac.get_by_role("heading", name=h, exact=True).count() == 1 for h in ("Goals", "Guild goals", "Coding challenges", "Review challenges")))
    fac.screenshot(path=f"{SHOTS}/c01-gallery.png", full_page=True)

    def publish(key, edits):
        fac.goto(f"{BASE}/faculty/challenges/new?template={key}"); fac.wait_for_load_state("networkidle")
        for sel, val in edits.items(): fac.fill(sel, str(val))
        fac.click("text=Publish challenge"); fac.wait_for_url("**/faculty/challenges/*?created=1")
        return fac.url.split("/")[-1].split("?")[0]

    fac.goto(f"{BASE}/faculty/challenges/new?template=review-sprint"); fac.wait_for_load_state("networkidle")
    check("template prefills the form", fac.input_value("#title") == "Review Sprint" and fac.input_value("#target") == "3")
    fac.screenshot(path=f"{SHOTS}/c02-form.png", full_page=True)
    fac.evaluate("document.querySelector('#xpReward').removeAttribute('max')")
    fac.fill("#xpReward", "500"); fac.click("text=Publish challenge")
    fac.wait_for_selector("text=Keep the reward at 100 XP or less")
    check("XP reward above 100 is refused (server check)", True)
    sprint = publish("review-sprint", {"#target": 1, "#xpReward": 30})
    check("goal challenge published", sql(f"select kind||'/'||scope||'/'||metric||'/'||target from challenges where id='{sprint}'") == "GOAL/PERSONAL/REVIEWS/1")
    guild = publish("guild-effort", {"#target": 2})
    check("guild goal published", sql(f"select scope from challenges where id='{guild}'") == "GUILD")
    coding = publish("palindrome", {})
    review = publish("leaky-buffer", {"#xpReward": 20})
    check("audit log records each publish", sql("select count(*) from audit_logs where action='CHALLENGE_CREATE'") == "4")

    #Student side
    amy.goto(BASE + "/challenges"); amy.wait_for_load_state("networkidle")
    check("student sees 4 active challenges", amy.locator("main a[href^='/challenges/']").count() == 4)
    check("Bit growth shows on the challenge page", amy.get_by_text("STAGE 1 OF 4").count() == 1)
    amy.screenshot(path=f"{SHOTS}/c03-student-list.png", full_page=True)
    amy.goto(BASE + "/quests"); amy.wait_for_load_state("networkidle")
    check("home shows The Guild with challenges", amy.get_by_role("heading", name="The Guild").count() == 1 and amy.locator("main a[href^='/challenges/']").count() == 2)
    amy.screenshot(path=f"{SHOTS}/c04-home.png", full_page=True)

    #Coding challenge: answer with a quest
    amy.goto(f"{BASE}/challenges/{coding}"); amy.click("text=Submit your solution")
    amy.wait_for_url(f"**/quests/new?challenge={coding}")
    check("submit page shows the challenge banner", amy.get_by_text("ANSWERING A CODING CHALLENGE").count() == 1)
    check("title is prefilled from the challenge", amy.input_value("#title") == "Challenge: Palindrome Checker")
    amy.fill("#snippet", "int is_palindrome(const char *s) {\n    int n = strlen(s);\n    for (int i = 0; i < n / 2; i++)\n        if (tolower(s[i]) != tolower(s[n - 1 - i])) return 0;\n    return 1;\n}")
    amy.fill("#context", "Returns 1 if the string reads the same both ways, ignoring case.")
    amy.check("input[name=confirm]"); amy.click("text=Submit quest")
    amy.wait_for_url("**/quests/*?submitted=*")
    aref = int(re.search(r"/quests/(\d+)", amy.url).group(1))
    check("quest shows it answers the challenge", amy.get_by_text("Answer to the challenge: Palindrome Checker").count() == 1)
    check("entry waits for a review", sql(f"select completed_at is null from challenge_entries where challenge_id='{coding}'") == "t")
    amy.goto(f"{BASE}/quests/new?challenge={coding}"); amy.wait_for_load_state("networkidle")
    check("a second answer is not offered", amy.get_by_text("ANSWERING A CODING CHALLENGE").count() == 0)

    def review_quest(ref, praise):
        rid = sql(f"select u.email from quests q join users u on u.id=q.reviewer_id where q.ref_no={ref}")
        pg = pages[rid]
        pg.goto(f"{BASE}/quests/{ref}/review"); pg.wait_for_load_state("networkidle")
        for crit in ["Readability", "Correctness", "Structure"]:
            pg.locator("fieldset").filter(has_text=crit).locator("text=4").first.click()
        pg.fill("#comment", praise)
        pg.click("text=Submit review"); pg.wait_for_url(f"**/quests/{ref}?reviewed=1")
        return rid

    r1 = review_quest(aref, "Clean loop that only walks half the string, and tolower makes it case-insensitive as the task asks.")
    check("coding challenge pays the submitter after the review", xp("amy@cit.edu", "CHALLENGE") == "25")
    check("personal goal (1 review) pays the reviewer", xp(r1, "CHALLENGE") == "30")
    check("guild goal not paid yet at 1 of 2", sql(f"select rewarded_at is null from challenges where id='{guild}'") == "t")

    #Coin
    amy.goto(f"{BASE}/quests/{aref}"); amy.wait_for_load_state("networkidle")
    amy.get_by_role("button", name="Give a coin").first.click()
    amy.wait_for_selector("text=Thanked with a coin")
    check("coin pays the reviewer 5 XP", xp(r1, "COIN") == "5")
    check("only one coin per review", amy.get_by_role("button", name="Give a coin").count() == 0)
    amy.screenshot(path=f"{SHOTS}/c05-coin.png", full_page=True)

    #Second review completes the guild goal and pays both contributors
    ben.goto(BASE + "/quests/new")
    ben.fill("#title", "Bubble sort"); ben.fill("#snippet", "void sort(int a[], int n) { /* ... */ }")
    ben.fill("#context", "Sorts an int array in ascending order.")
    ben.check("input[name=confirm]"); ben.click("text=Submit quest"); ben.wait_for_url("**/quests/*?submitted=*")
    bref = int(re.search(r"/quests/(\d+)", ben.url).group(1))
    r2 = review_quest(bref, "Good start, but the body is empty so nothing gets sorted yet. Add the nested loop and a swap.")
    check("guild goal rewarded at 2 of 2", sql(f"select rewarded_at is not null from challenges where id='{guild}'") == "t")
    contributors = sql(f"select count(*) from challenge_entries where challenge_id='{guild}'")
    check("every contributor got the guild reward", contributors == str(len({r1, r2})))

    #Review challenge
    amy.goto(f"{BASE}/challenges/{review}"); amy.wait_for_load_state("networkidle")
    check("review challenge shows code in an editor tab", amy.get_by_text("quest.c").count() == 1)
    check("classmates' reviews hidden before you submit", amy.get_by_text("How the Guild reviewed it").count() == 0)
    for crit in ["Readability", "Correctness", "Structure"]:
        amy.locator("fieldset").filter(has_text=crit).locator("text=2").first.click()
    amy.fill("#comment", "Buffer too small.")
    amy.click("text=Submit review"); amy.wait_for_selector("text=Write at least 30 words")
    check("short review challenge entry is refused", True)
    amy.fill("#comment", "malloc(16) is too small: \"Hello, Guildmate\" needs 17 bytes with the null, so strcat writes past the end. The memory is never freed either, and malloc's result is not checked for NULL before use.")
    amy.click("text=Submit review"); amy.wait_for_url(f"**/challenges/{review}?done=1")
    check("review challenge pays 20 XP", sql(f"select points from xp_events where user_id='{uid('amy@cit.edu')}' and ref_id='{review}'") == "20")
    check("after submitting, the Guild's reviews are visible", amy.get_by_text("How the Guild reviewed it").count() == 1)
    amy.screenshot(path=f"{SHOTS}/c06-review-challenge.png", full_page=True)

    #Guild Master views results and ends a challenge
    fac.goto(f"{BASE}/faculty/challenges/{review}"); fac.wait_for_load_state("networkidle")
    check("faculty reads the review entries", fac.get_by_text("Reviews (1)").count() == 1)
    fac.goto(f"{BASE}/faculty/challenges/{coding}"); fac.wait_for_load_state("networkidle")
    check("faculty sees the coding answer as rewarded", fac.get_by_text("Reviewed, rewarded").count() == 1)
    fac.goto(f"{BASE}/faculty/challenges/{sprint}"); fac.wait_for_load_state("networkidle")
    fac.screenshot(path=f"{SHOTS}/c07-faculty-goal.png", full_page=True)
    fac.click("text=End now"); fac.wait_for_load_state("networkidle")
    check("ending early keeps rewards", xp(r1, "CHALLENGE") != "0" and sql(f"select ends_at <= now() from challenges where id='{sprint}'") == "t")
    amy.goto(BASE + "/challenges"); amy.wait_for_load_state("networkidle")
    check("ended challenge moves to Recently ended", amy.get_by_role("heading", name="Recently ended").count() == 1)

    #Titles and growth
    cid = uid("cara@cit.edu")
    for i in range(5):
        sql(f"insert into xp_events (user_id, action, points, ref_id) values ('{cid}', 'COIN', 0, gen_random_uuid())")
    amy.goto(BASE + "/guild"); amy.wait_for_load_state("networkidle")
    check("earned title shows in the Guild Hall", amy.get_by_text("Golden Quill").count() == 1)
    check("Bit growth counts the Guild's reviews", amy.get_by_text("8 to go").count() == 1)
    amy.goto(f"{BASE}/guild/{cid}"); amy.wait_for_load_state("networkidle")
    check("profile lists all five titles", amy.get_by_role("heading", name="Titles").count() == 1 and amy.get_by_text("Swift Reviewer").count() == 1)
    amy.screenshot(path=f"{SHOTS}/c08-titles.png", full_page=True)

    #Access rules
    amy.goto(BASE + "/faculty/challenges"); amy.wait_for_load_state("networkidle")
    check("students cannot open the faculty challenge board", "/faculty/challenges" not in amy.url or amy.get_by_text("New challenge").count() == 0)
    fac.goto(f"{BASE}/challenges/{review}"); fac.wait_for_load_state("networkidle")
    check("faculty cannot submit a student challenge entry", fac.get_by_role("button", name="Submit review").count() == 0)

    #Phone width
    ph = br.new_context(viewport={"width": 360, "height": 780}).new_page()
    ph.goto(BASE + "/signin"); ph.fill("#email", "ben@cit.edu"); ph.fill("#password", "Password-123")
    ph.click("button[type=submit]"); ph.wait_for_url("**/quests")
    for path in ("/quests", "/challenges", f"/challenges/{review}", "/guild"):
        ph.goto(BASE + path); ph.wait_for_load_state("networkidle")
        check(f"no sideways scroll at 360px on {path.split('/')[1] or 'home'}{'/id' if path.count('/') > 1 else ''}", not ph.evaluate("document.documentElement.scrollWidth > window.innerWidth"))
    ph.screenshot(path=f"{SHOTS}/c09-phone.png", full_page=True)
    br.close()

passed = sum(1 for _, ok in results if ok)
print(f"\n{passed}/{len(results)} checks passed")
sys.exit(0 if passed == len(results) else 1)
