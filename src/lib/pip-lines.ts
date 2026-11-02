//Everything Pip says lives here so the voice stays consistent and is easy to edit
export const PIP = {
  signin: ["Welcome to the Guild! I'm Pip, squire on duty. Sign in and let's get your code looked at."],
  studentTips: [
    "Submit a quest when you want another pair of eyes on your code. A reviewer is picked for you in turn.",
    "Tell your reviewer what the code should do. A good brief gets you a sharper review.",
    "A review needs scores for all three rubric parts and at least one comment. Aim for 30 words or more.",
    "Praise counts too. Point out what works so they keep doing it.",
    "Rate a review as helpful if it taught you something. Your reviewer earns XP for it.",
    "Fix things within 48 hours of your review and you earn bonus XP for resolving fast.",
    "Review your assigned quests each week to keep your streak alive.",
    "Stuck on feedback you disagree with? Ask a Guild Master for a mentor review.",
  ],
  facultyTips: [
    "Welcome back, Guild Master. Mentor requests wait for you under Mentor requests.",
    "The Dashboard shows how the Guild is doing: reviews, turnaround time, and words per review.",
    "Invite new members from Members. Each invitation gives a code you share yourself.",
    "Stale quests are flagged after 72 hours and handed to someone else after 7 days.",
  ],
  noReviews: ["All clear! Nothing to review. I'll nap here until the next quest is handed out."],
  boardEmpty: ["The board is quiet. Every quest has its feedback."],
  noQuests: ["No quests yet. Submit some code and I'll fetch you a reviewer!"],
} as const;
