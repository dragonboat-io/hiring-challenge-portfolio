import "server-only";

import { and, asc, desc, eq, like, or, sql } from "drizzle-orm";
import { getDb } from "@/lib/db/client";
import { comments, goals, projects, roadmaps, users, type ProjectStatus } from "@/lib/db/schema";

/**
 * The single data-access layer. Both the UI (server components + server
 * actions) and the assistant's tools call these — the assistant gets no
 * privileged path of its own, so a tool can never write a shape the UI
 * couldn't produce.
 */

export interface ProjectSummary {
  id: number;
  title: string;
  status: ProjectStatus;
  roadmap: string | null;
  goal: string | null;
  owner: string | null;
}

export interface ProjectDetail extends ProjectSummary {
  details: string;
  roadmapId: number | null;
  goalId: number | null;
  ownerId: number | null;
  updatedAt: string;
  commentCount: number;
}

const selectShape = {
  id: projects.id,
  title: projects.title,
  details: projects.details,
  status: projects.status,
  roadmapId: projects.roadmapId,
  goalId: projects.goalId,
  ownerId: projects.ownerId,
  updatedAt: projects.updatedAt,
  roadmap: roadmaps.name,
  goal: goals.name,
  owner: users.name,
};

function baseQuery() {
  return getDb()
    .select(selectShape)
    .from(projects)
    .leftJoin(roadmaps, eq(projects.roadmapId, roadmaps.id))
    .leftJoin(goals, eq(projects.goalId, goals.id))
    .leftJoin(users, eq(projects.ownerId, users.id));
}

export interface ListProjectsFilter {
  /** Matched against title and details. */
  query?: string;
  status?: ProjectStatus;
  roadmap?: string;
  goal?: string;
  owner?: string;
  limit?: number;
}

export async function listProjects(filter: ListProjectsFilter = {}): Promise<ProjectSummary[]> {
  const conditions = [];
  if (filter.query) {
    const needle = `%${filter.query.toLowerCase()}%`;
    conditions.push(
      or(like(sql`lower(${projects.title})`, needle), like(sql`lower(${projects.details})`, needle)),
    );
  }
  if (filter.status) conditions.push(eq(projects.status, filter.status));
  // Name-based filters are case-insensitive so the assistant can pass what the
  // user typed ("q3 platform") without an exact-match lookup first.
  if (filter.roadmap) conditions.push(eq(sql`lower(${roadmaps.name})`, filter.roadmap.toLowerCase()));
  if (filter.goal) conditions.push(eq(sql`lower(${goals.name})`, filter.goal.toLowerCase()));
  if (filter.owner) {
    const needle = `%${filter.owner.toLowerCase()}%`;
    conditions.push(or(like(sql`lower(${users.name})`, needle), like(sql`lower(${users.email})`, needle)));
  }

  const rows = await baseQuery()
    .where(conditions.length ? and(...conditions) : undefined)
    .orderBy(desc(projects.updatedAt))
    .limit(filter.limit ?? 50);

  return rows.map(({ details: _details, roadmapId: _r, goalId: _g, ownerId: _o, updatedAt: _u, ...rest }) => rest);
}

export async function getProject(id: number): Promise<ProjectDetail | null> {
  const [row] = await baseQuery().where(eq(projects.id, id)).limit(1);
  if (!row) return null;
  const [{ count }] = await getDb()
    .select({ count: sql<number>`count(*)` })
    .from(comments)
    .where(eq(comments.projectId, id));
  return { ...row, commentCount: Number(count) };
}

export interface ProjectWrite {
  title?: string;
  details?: string;
  status?: ProjectStatus;
  roadmapId?: number | null;
  goalId?: number | null;
  ownerId?: number | null;
}

export async function createProject(input: ProjectWrite & { title: string }): Promise<number> {
  const [row] = await getDb().insert(projects).values(input).returning({ id: projects.id });
  return row.id;
}

export async function updateProject(id: number, patch: ProjectWrite): Promise<boolean> {
  // Callers build the patch from validated, explicitly-present fields only, so
  // an empty object here means "nothing to change" rather than "blank it out".
  if (Object.keys(patch).length === 0) return true;
  const result = await getDb()
    .update(projects)
    .set({ ...patch, updatedAt: sql`(current_timestamp)` })
    .where(eq(projects.id, id));
  return result.changes > 0;
}

export async function listComments(projectId: number) {
  return getDb()
    .select({
      id: comments.id,
      body: comments.body,
      createdAt: comments.createdAt,
      author: users.name,
    })
    .from(comments)
    .leftJoin(users, eq(comments.authorId, users.id))
    .where(eq(comments.projectId, projectId))
    .orderBy(asc(comments.createdAt));
}

export async function addComment(projectId: number, authorId: number | null, body: string) {
  await getDb().insert(comments).values({ projectId, authorId, body });
}

/** Lookup tables, used by the edit form's selects and by the assistant's resolve_* tool. */
export async function listRoadmaps() {
  return getDb().select().from(roadmaps).orderBy(asc(roadmaps.name));
}

export async function listGoals() {
  return getDb().select().from(goals).orderBy(asc(goals.name));
}

export async function listUsers() {
  return getDb().select().from(users).orderBy(asc(users.name));
}
