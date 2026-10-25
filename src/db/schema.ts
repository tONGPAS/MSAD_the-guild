//Data model from SRS v1.0 Section 7 (entities, data dictionary, ERD)
import { relations } from "drizzle-orm";
import {
  type AnyPgColumn,
  boolean,
  index,
  integer,
  pgEnum,
  pgTable,
  primaryKey,
  serial,
  smallint,
  text,
  timestamp,
  uniqueIndex,
  uuid,
  varchar,
} from "drizzle-orm/pg-core";

export const roleEnum = pgEnum("role", ["STUDENT", "FACULTY"]);
export const userStatusEnum = pgEnum("user_status", ["ACTIVE", "INACTIVE"]);
export const difficultyEnum = pgEnum("difficulty", ["EASY", "MEDIUM", "HARD"]);
export const questStatusEnum = pgEnum("quest_status", ["PENDING", "IN_REVIEW", "COMPLETED", "RESOLVED"]);
export const commentKindEnum = pgEnum("comment_kind", ["ISSUE", "PRAISE", "REPLY"]);
export const mentorStatusEnum = pgEnum("mentor_status", ["PENDING", "IN_PROGRESS", "RESOLVED"]);
export const rankEnum = pgEnum("rank", ["APPRENTICE", "JOURNEYMAN", "ADEPT", "EXPERT", "MASTER"]);

const ts = (name: string) => timestamp(name, { withTimezone: true });

export const users = pgTable(
  "users",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    name: varchar("name", { length: 100 }).notNull(),
    email: varchar("email", { length: 254 }).notNull().unique(),
    passwordHash: varchar("password_hash", { length: 100 }).notNull(),
    role: roleEnum("role").notNull(),
    status: userStatusEnum("status").notNull().default("ACTIVE"),
    xpTotal: integer("xp_total").notNull().default(0),
    rank: rankEnum("rank").notNull().default("APPRENTICE"),
    streak: integer("streak").notNull().default(0),
    consentAt: ts("consent_at"),
    failedLogins: integer("failed_logins").notNull().default(0),
    lockedUntil: ts("locked_until"),
    lastAssignedAt: ts("last_assigned_at"),
    createdAt: ts("created_at").notNull().defaultNow(),
  },
  (t) => [index("users_pool_idx").on(t.role, t.status, t.lastAssignedAt)],
);

//Server-side sessions so deactivation (FR-05) and idle timeout (FR-06) can end them
export const sessions = pgTable(
  "sessions",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    tokenHash: varchar("token_hash", { length: 64 }).notNull().unique(),
    userId: uuid("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
    lastSeenAt: ts("last_seen_at").notNull().defaultNow(),
    createdAt: ts("created_at").notNull().defaultNow(),
  },
  (t) => [index("sessions_user_idx").on(t.userId)],
);

export const invitations = pgTable(
  "invitations",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    code: varchar("code", { length: 32 }).notNull().unique(),
    email: varchar("email", { length: 254 }).notNull(),
    role: roleEnum("role").notNull().default("STUDENT"),
    issuedBy: uuid("issued_by").notNull().references(() => users.id),
    expiresAt: ts("expires_at").notNull(),
    usedAt: ts("used_at"),
    createdAt: ts("created_at").notNull().defaultNow(),
  },
  (t) => [index("invitations_email_idx").on(t.email)],
);

export const quests = pgTable(
  "quests",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    refNo: serial("ref_no").notNull().unique(),
    title: varchar("title", { length: 120 }).notNull(),
    link: varchar("link", { length: 300 }),
    snippet: varchar("snippet", { length: 10000 }),
    difficulty: difficultyEnum("difficulty").notNull(),
    status: questStatusEnum("status").notNull().default("PENDING"),
    prTitle: varchar("pr_title", { length: 300 }),
    prSize: integer("pr_size"),
    attachmentRef: varchar("attachment_ref", { length: 300 }),
    submitterId: uuid("submitter_id").notNull().references(() => users.id),
    reviewerId: uuid("reviewer_id").references(() => users.id),
    createdAt: ts("created_at").notNull().defaultNow(),
    assignedAt: ts("assigned_at"),
    completedAt: ts("completed_at"),
    resolvedAt: ts("resolved_at"),
  },
  (t) => [
    index("quests_submitter_idx").on(t.submitterId),
    index("quests_reviewer_idx").on(t.reviewerId, t.status),
    index("quests_status_idx").on(t.status, t.assignedAt),
  ],
);

export const reviews = pgTable(
  "reviews",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    questId: uuid("quest_id").notNull().references(() => quests.id, { onDelete: "cascade" }),
    reviewerId: uuid("reviewer_id").notNull().references(() => users.id),
    readability: smallint("readability").notNull(),
    correctness: smallint("correctness").notNull(),
    structure: smallint("structure").notNull(),
    helpful: boolean("helpful"),
    isMentor: boolean("is_mentor").notNull().default(false),
    createdAt: ts("created_at").notNull().defaultNow(),
  },
  (t) => [index("reviews_quest_idx").on(t.questId)],
);

export const comments = pgTable(
  "comments",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    reviewId: uuid("review_id").notNull().references(() => reviews.id, { onDelete: "cascade" }),
    authorId: uuid("author_id").notNull().references(() => users.id),
    kind: commentKindEnum("kind").notNull(),
    body: varchar("body", { length: 2000 }).notNull(),
    parentId: uuid("parent_id").references((): AnyPgColumn => comments.id, { onDelete: "cascade" }),
    createdAt: ts("created_at").notNull().defaultNow(),
  },
  (t) => [index("comments_review_idx").on(t.reviewId)],
);

export const mentorRequests = pgTable(
  "mentor_requests",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    questId: uuid("quest_id").notNull().references(() => quests.id, { onDelete: "cascade" }),
    reason: varchar("reason", { length: 500 }).notNull(),
    status: mentorStatusEnum("status").notNull().default("PENDING"),
    handledBy: uuid("handled_by").references(() => users.id),
    createdAt: ts("created_at").notNull().defaultNow(),
    resolvedAt: ts("resolved_at"),
  },
  (t) => [index("mentor_status_idx").on(t.status, t.createdAt)],
);

export const statusLogs = pgTable(
  "status_logs",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    questId: uuid("quest_id").notNull().references(() => quests.id, { onDelete: "cascade" }),
    fromStatus: questStatusEnum("from_status"),
    toStatus: questStatusEnum("to_status").notNull(),
    changedBy: uuid("changed_by").references(() => users.id),
    changedAt: ts("changed_at").notNull().defaultNow(),
  },
  (t) => [index("status_logs_quest_idx").on(t.questId)],
);

//refId + unique index stops the same action from paying XP twice
export const xpEvents = pgTable(
  "xp_events",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: uuid("user_id").notNull().references(() => users.id),
    action: varchar("action", { length: 40 }).notNull(),
    points: integer("points").notNull(),
    refId: uuid("ref_id").notNull(),
    createdAt: ts("created_at").notNull().defaultNow(),
  },
  (t) => [uniqueIndex("xp_once_idx").on(t.userId, t.action, t.refId)],
);

export const userBadges = pgTable(
  "user_badges",
  {
    userId: uuid("user_id").notNull().references(() => users.id),
    badgeCode: varchar("badge_code", { length: 40 }).notNull(),
    awardedAt: ts("awarded_at").notNull().defaultNow(),
  },
  (t) => [primaryKey({ columns: [t.userId, t.badgeCode] })],
);

export const notifications = pgTable(
  "notifications",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: uuid("user_id").notNull().references(() => users.id),
    message: varchar("message", { length: 300 }).notNull(),
    relatedQuestId: uuid("related_quest_id").references(() => quests.id, { onDelete: "set null" }),
    readAt: ts("read_at"),
    createdAt: ts("created_at").notNull().defaultNow(),
  },
  (t) => [index("notifications_user_idx").on(t.userId, t.readAt)],
);

//Append-only (SR-05): the app never updates or deletes rows here
export const auditLogs = pgTable(
  "audit_logs",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: uuid("user_id").references(() => users.id),
    action: varchar("action", { length: 40 }).notNull(),
    target: text("target"),
    createdAt: ts("created_at").notNull().defaultNow(),
  },
  (t) => [index("audit_created_idx").on(t.createdAt)],
);

export const usersRelations = relations(users, ({ many }) => ({
  questsSubmitted: many(quests, { relationName: "submitter" }),
  questsReviewing: many(quests, { relationName: "reviewer" }),
}));

export const questsRelations = relations(quests, ({ one, many }) => ({
  submitter: one(users, { fields: [quests.submitterId], references: [users.id], relationName: "submitter" }),
  reviewer: one(users, { fields: [quests.reviewerId], references: [users.id], relationName: "reviewer" }),
  reviews: many(reviews),
  statusLogs: many(statusLogs),
}));

export const reviewsRelations = relations(reviews, ({ one, many }) => ({
  quest: one(quests, { fields: [reviews.questId], references: [quests.id] }),
  reviewer: one(users, { fields: [reviews.reviewerId], references: [users.id] }),
  comments: many(comments),
}));

export const commentsRelations = relations(comments, ({ one }) => ({
  review: one(reviews, { fields: [comments.reviewId], references: [reviews.id] }),
  author: one(users, { fields: [comments.authorId], references: [users.id] }),
}));

export const statusLogsRelations = relations(statusLogs, ({ one }) => ({
  quest: one(quests, { fields: [statusLogs.questId], references: [quests.id] }),
  changer: one(users, { fields: [statusLogs.changedBy], references: [users.id] }),
}));

export type User = typeof users.$inferSelect;
export type Quest = typeof quests.$inferSelect;
export type QuestStatus = (typeof questStatusEnum.enumValues)[number];
export type Role = (typeof roleEnum.enumValues)[number];
