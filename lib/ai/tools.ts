import "server-only";

import { tool, type ToolSet } from "ai";
import { z } from "zod";
import {
  createProject,
  getProject,
  listComments,
  listGoals,
  listProjects,
  listRoadmaps,
  listUsers,
  updateProject,
  type ProjectWrite,
} from "@/lib/db/projects";
import { projectStatusValues } from "@/lib/db/schema";

const statusSchema = z.enum(projectStatusValues);

/**
 * Resolves a human name to a lookup-table id.
 *
 * The model is given names, never ids — asking it to remember numeric ids
 * across turns is the main source of wrong writes. On a miss we return the
 * valid options rather than an opaque failure, so the model can correct
 * itself on the next step instead of inventing a value.
 */
async function resolveByName(
  kind: "roadmap" | "goal" | "owner",
  name: string,
): Promise<{ id: number } | { error: string }> {
  const rows =
    kind === "roadmap"
      ? await listRoadmaps()
      : kind === "goal"
        ? await listGoals()
        : (await listUsers()).map((user) => ({ id: user.id, name: user.name }));

  const needle = name.trim().toLowerCase();
  const exact = rows.find((row) => row.name.toLowerCase() === needle);
  if (exact) return { id: exact.id };
  const partial = rows.filter((row) => row.name.toLowerCase().includes(needle));
  if (partial.length === 1) return { id: partial[0].id };

  return {
    error:
      partial.length > 1
        ? `"${name}" is ambiguous for ${kind}. Matches: ${partial.map((r) => r.name).join(", ")}.`
        : `No ${kind} named "${name}". Available: ${rows.map((r) => r.name).join(", ")}.`,
  };
}

/** Shared by create and update — turns the model's names into foreign keys. */
async function buildWrite(input: {
  title?: string;
  details?: string;
  status?: z.infer<typeof statusSchema>;
  roadmap?: string;
  goal?: string;
  owner?: string;
}): Promise<{ patch: ProjectWrite } | { error: string }> {
  const patch: ProjectWrite = {};
  if (input.title !== undefined) patch.title = input.title;
  if (input.details !== undefined) patch.details = input.details;
  if (input.status !== undefined) patch.status = input.status;

  for (const [kind, value, column] of [
    ["roadmap", input.roadmap, "roadmapId"],
    ["goal", input.goal, "goalId"],
    ["owner", input.owner, "ownerId"],
  ] as const) {
    if (value === undefined) continue;
    // An explicit empty string is how the model clears a field.
    if (value.trim() === "") {
      patch[column] = null;
      continue;
    }
    const resolved = await resolveByName(kind, value);
    if ("error" in resolved) return { error: resolved.error };
    patch[column] = resolved.id;
  }

  return { patch };
}

export function buildAssistantTools(): ToolSet {
  return {
    find_projects: tool({
      description:
        "Search projects. All filters are optional and combine with AND; call with no arguments to list everything. Use this before any update so you are working from a real project id.",
      inputSchema: z.object({
        query: z.string().optional().describe("Free text matched against title and details."),
        status: statusSchema.optional(),
        roadmap: z.string().optional().describe("Roadmap name, e.g. 'Q3 Platform'."),
        goal: z.string().optional().describe("Goal name."),
        owner: z.string().optional().describe("Owner name or email, partial match allowed."),
      }),
      execute: async (filter) => {
        const results = await listProjects(filter);
        return { count: results.length, projects: results };
      },
    }),

    get_project: tool({
      description: "Read one project in full, including its comment thread.",
      inputSchema: z.object({ id: z.number().int().positive() }),
      execute: async ({ id }) => {
        const project = await getProject(id);
        if (!project) return { error: `No project with id ${id}.` };
        return { project, comments: await listComments(id) };
      },
    }),

    list_options: tool({
      description:
        "List the roadmaps, goals and users that exist, with their exact names. Use when the user's wording may not match a stored name.",
      inputSchema: z.object({}),
      execute: async () => ({
        roadmaps: (await listRoadmaps()).map((r) => r.name),
        goals: (await listGoals()).map((g) => g.name),
        users: (await listUsers()).map((u) => u.name),
        statuses: projectStatusValues,
      }),
    }),

    create_project: tool({
      description:
        "Create a project. Only the title is required. Roadmap, goal and owner are given as names and resolved server-side.",
      inputSchema: z.object({
        title: z.string().min(1).max(200),
        details: z.string().optional(),
        status: statusSchema.optional(),
        roadmap: z.string().optional(),
        goal: z.string().optional(),
        owner: z.string().optional(),
      }),
      execute: async (input) => {
        const built = await buildWrite(input);
        if ("error" in built) return { error: built.error };
        const id = await createProject({ ...built.patch, title: input.title });
        return { created: true, project: await getProject(id) };
      },
    }),

    update_project: tool({
      description:
        "Update an existing project. Only the fields you pass are changed; pass an empty string for roadmap, goal or owner to clear it.",
      inputSchema: z.object({
        id: z.number().int().positive(),
        title: z.string().min(1).max(200).optional(),
        details: z.string().optional(),
        status: statusSchema.optional(),
        roadmap: z.string().optional(),
        goal: z.string().optional(),
        owner: z.string().optional(),
      }),
      execute: async ({ id, ...input }) => {
        if (!(await getProject(id))) return { error: `No project with id ${id}.` };
        const built = await buildWrite(input);
        if ("error" in built) return { error: built.error };
        await updateProject(id, built.patch);
        return { updated: true, project: await getProject(id) };
      },
    }),
  };
}
