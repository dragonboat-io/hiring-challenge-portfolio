"use client";

import { useActionState, useEffect, useState } from "react";
import { useFormStatus } from "react-dom";
import { saveProjectAction, type FormState } from "@/app/actions";
import { buttonPrimary, control, FieldLabel, fullTime, relativeTime, STATUS_LABEL } from "@/components/ui";
import type { ProjectDetail } from "@/lib/db/projects";
import { projectStatusValues } from "@/lib/db/schema";

export interface Option {
  id: number;
  name: string;
}

function Submit({ saved }: { saved: boolean }) {
  const { pending } = useFormStatus();
  return (
    <div className="flex items-center gap-3">
      <button type="submit" disabled={pending} className={buttonPrimary}>
        {pending ? "Saving…" : "Save changes"}
      </button>
      {saved && !pending ? (
        <span role="status" className="animate-rise text-sm text-muted">
          Saved
        </span>
      ) : null}
    </div>
  );
}

function Select({ label, name, value, options }: { label: string; name: string; value: number | null; options: Option[] }) {
  return (
    <label className="block">
      <FieldLabel>{label}</FieldLabel>
      <select name={name} defaultValue={value ?? ""} className={`${control} mt-1.5 w-full`}>
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

  // Show "Saved" briefly after a clean round-trip. state is a fresh object per
  // submission, so this fires once per successful save.
  const [saved, setSaved] = useState(false);
  useEffect(() => {
    if (!state || state.error) return;
    setSaved(true);
    const timer = setTimeout(() => setSaved(false), 2500);
    return () => clearTimeout(timer);
  }, [state]);

  // Keyed on updatedAt so an assistant-driven change (which revalidates the
  // page) resets the uncontrolled inputs to the new server values instead of
  // leaving stale text on screen.
  return (
    <form key={project.updatedAt} action={formAction} className="rounded-lg border border-line bg-surface">
      <div className="space-y-5 p-5">
        <label className="block">
          <span className="sr-only">Title</span>
          <input
            name="title"
            defaultValue={project.title}
            aria-label="Title"
            className="-mx-2 w-[calc(100%+1rem)] rounded-md border border-transparent bg-transparent px-2 py-1 text-xl font-semibold tracking-tight sm:text-2xl text-ink transition-colors hover:border-line focus:border-accent focus:outline-none focus:ring-2 focus:ring-accent/20"
          />
        </label>

        <label className="block">
          <FieldLabel>Details</FieldLabel>
          <textarea
            name="details"
            rows={5}
            defaultValue={project.details}
            placeholder="What is this project, and why does it matter?"
            className={`${control} mt-1.5 w-full resize-y leading-relaxed`}
          />
        </label>

        <div className="grid gap-4 sm:grid-cols-2">
          <label className="block">
            <FieldLabel>Status</FieldLabel>
            <select name="status" defaultValue={project.status} className={`${control} mt-1.5 w-full`}>
              {projectStatusValues.map((status) => (
                <option key={status} value={status}>
                  {STATUS_LABEL[status]}
                </option>
              ))}
            </select>
          </label>
          <Select label="Owner" name="ownerId" value={project.ownerId} options={users} />
          <Select label="Roadmap" name="roadmapId" value={project.roadmapId} options={roadmaps} />
          <Select label="Goal" name="goalId" value={project.goalId} options={goals} />
        </div>
      </div>

      <div className="flex flex-wrap items-center justify-between gap-3 border-t border-line px-5 py-3">
        <Submit saved={saved} />
        <span className="text-xs text-muted" title={fullTime(project.updatedAt)} suppressHydrationWarning>
          Updated {relativeTime(project.updatedAt)}
        </span>
      </div>
      {state?.error ? <p className="px-5 pb-3 text-xs text-red-600">{state.error}</p> : null}
    </form>
  );
}
