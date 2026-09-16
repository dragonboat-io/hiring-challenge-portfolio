import Database from "better-sqlite3";
import { drizzle } from "drizzle-orm/better-sqlite3";
import { comments, goals, projects, roadmaps, users } from "../lib/db/schema";

/**
 * Idempotent: bails if the DB already has projects, so `docker compose up`
 * on an existing volume doesn't duplicate rows.
 */
const path = process.env.DATABASE_PATH ?? "./data/app.db";
const sqlite = new Database(path);
const db = drizzle(sqlite);

const existing = db.select({ id: projects.id }).from(projects).limit(1).all();
if (existing.length > 0) {
  console.log("Seed skipped — database already has projects.");
  process.exit(0);
}

const userRows = db
  .insert(users)
  .values([
    { name: "Ada Okafor", email: "ada@example.com" },
    { name: "Bruno Lima", email: "bruno@example.com" },
    { name: "Mei Tanaka", email: "mei@example.com" },
  ])
  .returning()
  .all();

const roadmapRows = db
  .insert(roadmaps)
  .values([{ name: "Q3 Platform" }, { name: "Q4 Growth" }, { name: "Mobile" }])
  .returning()
  .all();

const goalRows = db
  .insert(goals)
  .values([
    { name: "Reduce time to value" },
    { name: "Expand enterprise revenue" },
    { name: "Improve reliability" },
  ])
  .returning()
  .all();

const [ada, bruno, mei] = userRows;
const [platform, growth, mobile] = roadmapRows;
const [timeToValue, enterprise, reliability] = goalRows;

const projectRows = db
  .insert(projects)
  .values([
    {
      title: "Guided onboarding checklist",
      details:
        "New workspaces land on an empty portfolio with no obvious next step. A dismissible checklist walks an admin through inviting a teammate, creating a roadmap and adding their first project.",
      status: "in_progress",
      roadmapId: platform.id,
      goalId: timeToValue.id,
      ownerId: ada.id,
    },
    {
      title: "Portfolio CSV export",
      details:
        "Enterprise buyers ask for their portfolio outside the tool for board decks. Export the current filtered view as CSV, columns following the visible table.",
      status: "planned",
      roadmapId: growth.id,
      goalId: enterprise.id,
      ownerId: bruno.id,
    },
    {
      title: "Comment mentions and notifications",
      details:
        "Comment threads are read-only in practice because nobody knows a comment was left. Support @mentions and send an email on mention.",
      status: "idea",
      roadmapId: platform.id,
      goalId: timeToValue.id,
      ownerId: mei.id,
    },
    {
      title: "Offline mode for the mobile app",
      details: "Field users lose the roadmap on flaky connections. Cache the last-loaded portfolio and queue edits.",
      status: "idea",
      roadmapId: mobile.id,
      goalId: reliability.id,
      ownerId: null,
    },
    {
      title: "Single sign-on with Okta",
      details: "SAML SSO, blocking two enterprise deals. Shipped behind a per-org flag.",
      status: "shipped",
      roadmapId: growth.id,
      goalId: enterprise.id,
      ownerId: bruno.id,
    },
  ])
  .returning()
  .all();

db.insert(comments)
  .values([
    {
      projectId: projectRows[0].id,
      authorId: bruno.id,
      body: "Do we gate this on the workspace being genuinely empty, or show it for the first week regardless?",
    },
    {
      projectId: projectRows[0].id,
      authorId: ada.id,
      body: "Empty-state only. Showing it over real data tested badly.",
    },
    {
      projectId: projectRows[1].id,
      authorId: mei.id,
      body: "Worth checking whether they want CSV or a scheduled email. Two of the three asks were really about the schedule.",
    },
  ])
  .run();

sqlite.close();
console.log(`Seeded ${projectRows.length} projects into ${path}`);
