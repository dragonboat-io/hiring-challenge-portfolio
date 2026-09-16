"use client";

import { useActionState } from "react";
import { useFormStatus } from "react-dom";
import { saveProjectAction, type FormState } from "@/app/actions";
import type { ProjectDetail } from "@/lib/db/projects";
import { projectStatusValues } from "@/lib/db/schema";

export interface Option {
  id: number;
  name: string;
}

const STATUS_LABEL: Record<string, string> = {
  idea: "Idea",
  planned: "Planned",
  in_progress: "In progress",
  shipped: "Shipped",
};

function Submit() {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      disabled={pending}
      className="rounded-md bg-ink px-4 py-2 text-sm font-medium text-white disabled:opacity-50"
    >
      {pending ? "Saving…" : "Save"}
    </button>
  );
}

function Select({ label, name, value, options }: { label: string; name: string; value: number | null; options: Option[] }) {
  return (
    <label className="block text-sm">
      <span className="text-xs uppercase tracking-wide text-muted">{label}</span>
      <select
        name={name}
        defaultValue={value ?? ""}
        className="mt-1 w-full rounded-md border border-line bg-surface px-3 py-2 text-sm"
      >
        <option value="">—</option>
        {options.map((option) => (
          <option key={option.id} value={option.id}>
            {option.name}
          </option>
        ))}
      </select>
    </label>
  );
}

export function ProjectForm({
  project,
  roadmaps,
  goals,
  users,
}: {
  project: ProjectDetail;
  roadmaps: Option[];
  goals: Option[];
  users: Option[];
}) {
  const action = saveProjectAction.bind(null, project.id);
  const [state, formAction] = useActionState<FormState, FormData>(action, undefined);

  // Keyed on updatedAt so an assistant-driven change (which revalidates the
  // page) resets the uncontrolled inputs to the new server values instead of
  // leaving stale text on screen.
  return (
    <form key={project.updatedAt} action={formAction} className="space-y-4 rounded-lg border border-line bg-surface p-5">
      <label className="block text-sm">
        <span className="text-xs uppercase tracking-wide text-muted">Title</span>
        <input
          name="title"
          defaultValue={project.title}
          className="mt-1 w-full rounded-md border border-line bg-surface px-3 py-2 text-base font-medium"
        />
      </label>

      <label className="block text-sm">
        <span className="text-xs uppercase tracking-wide text-muted">Details</span>
        <textarea
          name="details"
          rows={6}
          defaultValue={project.details}
          className="mt-1 w-full rounded-md border border-line bg-surface px-3 py-2 text-sm"
        />
      </label>

      <div className="grid gap-4 sm:grid-cols-2">
        <label className="block text-sm">
          <span className="text-xs uppercase tracking-wide text-muted">Status</span>
          <select
            name="status"
            defaultValue={project.status}
            className="mt-1 w-full rounded-md border border-line bg-surface px-3 py-2 text-sm"
          >
            {projectStatusValues.map((status) => (
              <option key={status} value={status}>
                {STATUS_LABEL[status]}
              </option>
            ))}
          </select>
        </label>
        <Select label="Roadmap" name="roadmapId" value={project.roadmapId} options={roadmaps} />
        <Select label="Goal" name="goalId" value={project.goalId} options={goals} />
        <Select label="User" name="ownerId" value={project.ownerId} options={users} />
      </div>

      <div className="flex items-center gap-3">
        <Submit />
        {state?.error ? <p className="text-xs text-red-600">{state.error}</p> : null}
      </div>
    </form>
  );
}
