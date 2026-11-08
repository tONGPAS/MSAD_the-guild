"use client";

import { useCallback, useEffect, useLayoutEffect, useRef, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { finishTour } from "@/modules/tutorial/actions";
import { Bit, type Pose } from "./bit";

type Step = { target?: string; title: string; body: string; pose: Pose };

const STUDENT: Step[] = [
  { title: "Hi there!", body: "I'm Bit, the Guild's slime. Let me show you around. It takes about a minute.", pose: "wave" },
  { target: "hud", title: "Your rank", body: "This is your rank and XP. Reviewing, submitting, and helpful ratings fill this bar. Click it to see your profile and badges.", pose: "idle" },
  { target: "card", title: "Your adventurer card", body: "Your week streak, badges, quest rewards left today, and reviews waiting on you, all in one place.", pose: "idle" },
  { target: "todo", title: "Reviews assigned to you", body: "When the Guild picks you as a reviewer, the quest lands here. A classmate is waiting, so try to finish within 72 hours.", pose: "think" },
  { target: "submit", title: "Get feedback on your code", body: "Submit a quest with a PR link or a snippet. Tell your reviewer what the code should do, and a classmate is picked for you in turn.", pose: "idle" },
  { target: "tabs", title: "Find your way", body: "The Quest Board shows what is open across the Guild. Challenges has goals and tasks from the Guild Masters, and the Guild Hall lists every member.", pose: "idle" },
  { target: "bell", title: "Notifications", body: "New assignments, reviews of your code, and badges all ring this bell.", pose: "idle" },
  { title: "That's the tour!", body: "Want to try a practice review first? The Training Grounds has three short levels of sample C code with hidden problems. No XP, no pressure.", pose: "cheer" },
];

const FACULTY: Step[] = [
  { title: "Welcome, Guild Master!", body: "I'm Bit, the Guild's slime. Here is a quick look at what you can do.", pose: "wave" },
  { target: "hud", title: "Your rank", body: "Faculty sit above every student rank as Guild Masters. You earn no XP, so student numbers stay clean for the study.", pose: "idle" },
  { target: "tabs", title: "Your tools", body: "All quests lists every submission. Mentor requests is where students ask for your review. Challenges lets you set goals and coding tasks. Dashboard shows the numbers, and Members is where you invite students.", pose: "idle" },
  { target: "filters", title: "Find any quest", body: "Search by title or person, and filter by status or difficulty.", pose: "think" },
  { target: "bell", title: "Notifications", body: "Mentor requests and other news ring this bell.", pose: "idle" },
  { title: "You're all set!", body: "You can replay this tour any time with the ? button in the header.", pose: "cheer" },
];

const HOME = { STUDENT: "/quests", FACULTY: "/faculty/quests" } as const;

//FR-46: guided first-run tour. Shown once on the home page, replayed with ?tour=1.
export function GuideTour({ role, autoStart }: { role: "STUDENT" | "FACULTY"; autoStart: boolean }) {
  const path = usePathname();
  const params = useSearchParams();
  const router = useRouter();
  const steps = role === "FACULTY" ? FACULTY : STUDENT;
  const atHome = path === HOME[role];
  const asked = params.get("tour") === "1";
  //A replay is its own "session" of the tour, so closing one does not block the next
  const token = asked ? "replay" : "auto";
  const [closed, setClosed] = useState<{ auto: boolean; replay: boolean }>({ auto: false, replay: false });
  const [prevAsked, setPrevAsked] = useState(asked);
  const [i, setI] = useState(0);
  if (prevAsked !== asked) {
    setPrevAsked(asked);
    setI(0);
    if (asked) setClosed((c) => ({ ...c, replay: false }));
  }
  const open = atHome && (asked || autoStart) && !closed[token];
  const [measured, setMeasured] = useState<{ step: number; rect: DOMRect } | null>(null);
  const rect = measured && measured.step === i ? measured.rect : null;
  const box = useRef<HTMLDivElement>(null);
  const step = steps[i];

  const close = useCallback(() => {
    setClosed({ auto: true, replay: true });
    void finishTour();
    if (asked) router.replace(path, { scroll: false });
  }, [asked, path, router]);

  //Follow the highlighted element as the page scrolls or resizes
  useLayoutEffect(() => {
    if (!open || !step.target) return;
    const el = document.querySelector<HTMLElement>(`[data-tour="${step.target}"]`);
    if (!el) return;
    const still = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    el.scrollIntoView({ block: "center", behavior: still ? "auto" : "smooth" });
    const update = () => setMeasured({ step: i, rect: el.getBoundingClientRect() });
    const frame = requestAnimationFrame(update);
    window.addEventListener("scroll", update, true);
    window.addEventListener("resize", update);
    return () => {
      cancelAnimationFrame(frame);
      window.removeEventListener("scroll", update, true);
      window.removeEventListener("resize", update);
    };
  }, [open, step, i]);

  useEffect(() => {
    if (open) box.current?.focus();
  }, [open, i]);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") close();
      if (e.key === "ArrowRight") setI((n) => Math.min(n + 1, steps.length - 1));
      if (e.key === "ArrowLeft") setI((n) => Math.max(n - 1, 0));
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, close, steps.length]);

  if (!open) return null;
  const last = i === steps.length - 1;
  const lowTarget = rect ? rect.top + rect.height / 2 > window.innerHeight / 2 : false;
  const pad = 6;

  return (
    <div className="fixed inset-0 z-50" data-testid="tour">
      {rect ? (
        <div
          aria-hidden
          className="pointer-events-none fixed rounded-xl outline-3 outline-gold-bright transition-all duration-300 motion-reduce:transition-none"
          style={{ left: rect.left - pad, top: rect.top - pad, width: rect.width + pad * 2, height: rect.height + pad * 2, boxShadow: "0 0 0 9999px rgb(18 10 28 / 0.62)" }}
        />
      ) : (
        <div aria-hidden className="fixed inset-0 bg-[rgb(18_10_28/0.62)]" />
      )}
      <div
        ref={box} tabIndex={-1} role="dialog" aria-modal="true" aria-labelledby="tour-title" aria-describedby="tour-body"
        className={`fixed inset-x-3 mx-auto max-w-lg outline-none ${rect && !lowTarget ? "bottom-4" : rect ? "top-4" : "top-1/2 -translate-y-1/2"}`}
      >
        <div key={i} className="anim-pop flex items-end gap-2">
          <Bit pose={step.pose} size={88} />
          <div className="panel mb-3 min-w-0 flex-1 p-4">
            <p className="font-pixel text-sm text-muted">Step {i + 1} of {steps.length}</p>
            <h2 id="tour-title" className="font-display text-xl font-extrabold">{step.title}</h2>
            <p id="tour-body" className="mt-1">{step.body}</p>
            <div className="mt-4 flex flex-wrap items-center gap-2">
              {i > 0 && <button type="button" className="btn-ghost" onClick={() => setI(i - 1)}>Back</button>}
              {!last && <button type="button" className="btn-primary" onClick={() => setI(i + 1)}>Next</button>}
              {last && role === "STUDENT" && (
                <Link href="/training" className="btn-gold" onClick={close}>Go to Training Grounds</Link>
              )}
              {last && <button type="button" className={role === "STUDENT" ? "btn-ghost" : "btn-primary"} onClick={close}>{role === "STUDENT" ? "Maybe later" : "Done"}</button>}
              {!last && <button type="button" className="ml-auto text-sm text-muted underline" onClick={close}>Skip tour</button>}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
