import { sql } from "drizzle-orm";
import { index, integer, sqliteTable, text } from "drizzle-orm/sqlite-core";

/**
 * A deliberately small slice of Dragonboat's portfolio model.
 *
 * `projects` stands in for a portfolio item. Roadmaps and goals are real
 * rows rather than free text on the project, because the assistant needs to
 * resolve a name ("Q3 Platform") to an id before it can write — which is the
 * interesting half of the tool-calling problem.
 */

export const users = sqliteTable("users", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  name: text("name").notNull(),
  email: text("email").notNull().unique(),
});

export const roadmaps = sqliteTable("roadmaps", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  name: text("name").notNull().unique(),
});

export const goals = sqliteTable("goals", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  name: text("name").notNull().unique(),
});

export const projectStatusValues = ["idea", "planned", "in_progress", "shipped"] as const;
export type ProjectStatus = (typeof projectStatusValues)[number];

export const projects = sqliteTable(
  "projects",
  {
    id: integer("id").primaryKey({ autoIncrement: true }),
    title: text("title").notNull(),
    details: text("details").notNull().default(""),
    status: text("status").$type<ProjectStatus>().notNull().default("idea"),
    roadmapId: integer("roadmap_id").references(() => roadmaps.id),
    goalId: integer("goal_id").references(() => goals.id),
    ownerId: integer("owner_id").references(() => users.id),
    createdAt: text("created_at")
      .notNull()
      .default(sql`(current_timestamp)`),
    updatedAt: text("updated_at")
      .notNull()
      .default(sql`(current_timestamp)`),
  },
  (table) => [index("projects_roadmap_idx").on(table.roadmapId), index("projects_owner_idx").on(table.ownerId)],
);

export const comments = sqliteTable(
  "comments",
  {
    id: integer("id").primaryKey({ autoIncrement: true }),
    projectId: integer("project_id")
      .notNull()
      .references(() => projects.id, { onDelete: "cascade" }),
    authorId: integer("author_id").references(() => users.id),
    body: text("body").notNull(),
    createdAt: text("created_at")
      .notNull()
      .default(sql`(current_timestamp)`),
  },
  (table) => [index("comments_project_idx").on(table.projectId)],
);
