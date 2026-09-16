"use server";

import { revalidatePath } from "next/cache";
import { cookies } from "next/headers";
import { z } from "zod";
import { addComment, createProject, updateProject } from "@/lib/db/projects";
import { projectStatusValues } from "@/lib/db/schema";
import { getCurrentUser, USER_COOKIE } from "@/lib/currentUser";

/** "" from an unselected <select> means "no value", not the number zero. */
const optionalId = z
  .string()
  .transform((value) => (value === "" ? null : Number(value)))
  .pipe(z.number().int().positive().nullable());

const projectFields = z.object({
  title: z.string().min(1, "Title is required").max(200),
  details: z.string().max(10_000),
  status: z.enum(projectStatusValues),
  roadmapId: optionalId,
  goalId: optionalId,
  ownerId: optionalId,
});

function parseProjectForm(formData: FormData) {
  return projectFields.safeParse({
    title: formData.get("title") ?? "",
    details: formData.get("details") ?? "",
    status: formData.get("status") ?? "idea",
    roadmapId: formData.get("roadmapId") ?? "",
    goalId: formData.get("goalId") ?? "",
    ownerId: formData.get("ownerId") ?? "",
  });
}

export type FormState = { error?: string } | undefined;

export async function saveProjectAction(id: number, _prev: FormState, formData: FormData): Promise<FormState> {
  const parsed = parseProjectForm(formData);
  if (!parsed.success) return { error: parsed.error.issues[0].message };
  await updateProject(id, parsed.data);
  revalidatePath(`/projects/${id}`);
  revalidatePath("/");
  return {};
}

export async function createProjectAction(_prev: FormState, formData: FormData): Promise<FormState> {
  const title = String(formData.get("title") ?? "").trim();
  if (!title) return { error: "Title is required" };
  const user = await getCurrentUser();
  await createProject({ title, ownerId: user?.id ?? null });
  revalidatePath("/");
  return {};
}

export async function addCommentAction(projectId: number, _prev: FormState, formData: FormData): Promise<FormState> {
  const body = String(formData.get("body") ?? "").trim();
  if (!body) return { error: "Comment cannot be empty" };
  const user = await getCurrentUser();
  await addComment(projectId, user?.id ?? null, body);
  revalidatePath(`/projects/${projectId}`);
  return {};
}

export async function switchUserAction(formData: FormData) {
  const id = String(formData.get("userId") ?? "");
  (await cookies()).set(USER_COOKIE, id, { httpOnly: true, sameSite: "lax", path: "/" });
  revalidatePath("/", "layout");
}
