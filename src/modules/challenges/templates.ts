//CR-02: premade challenges a Guild Master starts from. Every field can be edited before publishing.
export type Metric = "REVIEWS" | "PRAISE" | "DEEP_REVIEWS" | "FAST_RESOLVES" | "HELPFUL" | "COINS";
export type Kind = "GOAL" | "CODING" | "REVIEW";
export type Template = {
  key: string;
  kind: Kind;
  scope: "PERSONAL" | "GUILD";
  title: string;
  description: string;
  metric?: Metric;
  target?: number;
  xpReward: number;
  days: number;
  language?: "c" | "cpp";
  code?: string;
  context?: string;
};

//What each goal counts, in words a student understands
export const METRICS: Record<Metric, { label: string; unit: string }> = {
  REVIEWS: { label: "Reviews completed", unit: "reviews" },
  PRAISE: { label: "Praise comments written", unit: "praise comments" },
  DEEP_REVIEWS: { label: "Reviews of 50+ words", unit: "detailed reviews" },
  FAST_RESOLVES: { label: "Quests resolved within 48 hours of review", unit: "fast resolves" },
  HELPFUL: { label: "Reviews rated helpful", unit: "helpful ratings" },
  COINS: { label: "Thank-you coins received", unit: "coins" },
};

export const KIND_LABEL: Record<Kind, string> = { GOAL: "Goal", CODING: "Coding challenge", REVIEW: "Review challenge" };

//Limits that keep XP sane whatever a Guild Master types
export const CHALLENGE_LIMITS = { maxXp: 100, maxDays: 28, maxTarget: 50 };

export const TEMPLATES: Template[] = [
  { key: "review-sprint", kind: "GOAL", scope: "PERSONAL", title: "Review Sprint", description: "Finish 3 peer reviews this week. Every review you finish helps a classmate move forward.", metric: "REVIEWS", target: 3, xpReward: 30, days: 7 },
  { key: "kind-words", kind: "GOAL", scope: "PERSONAL", title: "Kind Words", description: "Write 5 praise comments. Pointing out what works is as useful as pointing out what doesn't.", metric: "PRAISE", target: 5, xpReward: 20, days: 7 },
  { key: "deep-dive", kind: "GOAL", scope: "PERSONAL", title: "Deep Dive", description: "Write 2 reviews of 50 words or more. Explain why something matters and how to fix it.", metric: "DEEP_REVIEWS", target: 2, xpReward: 25, days: 7 },
  { key: "fast-fixer", kind: "GOAL", scope: "PERSONAL", title: "Fast Fixer", description: "Resolve 2 of your quests within 48 hours of getting their review.", metric: "FAST_RESOLVES", target: 2, xpReward: 25, days: 14 },
  { key: "helpful-hand", kind: "GOAL", scope: "PERSONAL", title: "Helpful Hand", description: "Get 2 of your reviews rated helpful by the classmates you reviewed.", metric: "HELPFUL", target: 2, xpReward: 30, days: 14 },
  { key: "coin-collector", kind: "GOAL", scope: "PERSONAL", title: "Golden Comments", description: "Receive 3 thank-you coins for comments that helped someone.", metric: "COINS", target: 3, xpReward: 25, days: 14 },
  { key: "guild-effort", kind: "GOAL", scope: "GUILD", title: "Guild Effort", description: "Together, the Guild finishes 15 reviews this week. Everyone who helps gets the reward.", metric: "REVIEWS", target: 15, xpReward: 20, days: 7 },
  { key: "praise-parade", kind: "GOAL", scope: "GUILD", title: "Praise Parade", description: "Together, the Guild writes 20 praise comments this week. Everyone who writes one gets the reward.", metric: "PRAISE", target: 20, xpReward: 15, days: 7 },
  {
    key: "reverse-list", kind: "CODING", scope: "PERSONAL", title: "Reverse a Linked List", language: "c", xpReward: 30, days: 7,
    description: "Write Node *reverse(Node *head) that reverses a singly linked list in place and returns the new head. Add a short main() that builds a list of 5 numbers, reverses it, and prints it.",
  },
  {
    key: "palindrome", kind: "CODING", scope: "PERSONAL", title: "Palindrome Checker", language: "c", xpReward: 25, days: 7,
    description: "Write int is_palindrome(const char *s) that returns 1 if s reads the same both ways, ignoring upper and lower case. Show three test calls in main().",
  },
  {
    key: "int-stack", kind: "CODING", scope: "PERSONAL", title: "Stack Class", language: "cpp", xpReward: 35, days: 10,
    description: "Write a class IntStack backed by a fixed-size array with push, pop, peek, and isEmpty. Overflow and underflow must not crash the program.",
  },
  {
    key: "grade-report", kind: "CODING", scope: "PERSONAL", title: "Grade Report with Structs", language: "c", xpReward: 25, days: 7,
    description: "Define struct Student { char name[32]; int grades[5]; }, fill in 3 students, then print each student's average and whether they pass (75 and up).",
  },
  {
    key: "leaky-buffer", kind: "REVIEW", scope: "PERSONAL", title: "The Leaky Buffer", language: "c", xpReward: 20, days: 7,
    description: "Review this function like a real quest. Score it and comment on every problem you find.",
    context: "Builds a greeting for any name and prints it three times.",
    code: `#include <stdio.h>
#include <stdlib.h>
#include <string.h>

char *greet(const char *name) {
    char *msg = malloc(16);
    strcpy(msg, "Hello, ");
    strcat(msg, name);
    return msg;
}

int main(void) {
    for (int i = 0; i < 3; i++) {
        printf("%s\\n", greet("Guildmate"));
    }
    return 0;
}`,
  },
  {
    key: "shadow-counter", kind: "REVIEW", scope: "PERSONAL", title: "The Shadow Counter", language: "cpp", xpReward: 20, days: 7,
    description: "Review this C++ function. It compiles, but does it work? Score it and comment on what you find.",
    context: "Counts how many scores are above the limit.",
    code: `#include <iostream>
#include <vector>

int countAbove(const std::vector<int>& v, int limit) {
    int count = 0;
    for (int i = 0; i < v.size(); i++) {
        int count = 0;
        if (v[i] > limit) count++;
    }
    return count;
}

int main() {
    std::vector<int> scores = {80, 95, 60, 100};
    std::cout << countAbove(scores, 75) << std::endl;
}`,
  },
];

export const templateFor = (key: string) => TEMPLATES.find((t) => t.key === key);
