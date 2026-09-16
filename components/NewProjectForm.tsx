"use client";

import { useActionState } from "react";
import { useFormStatus } from "react-dom";
import { createProjectAction } from "@/app/actions";

function Submit() {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      disabled={pending}
      className="rounded-md bg-ink px-3 py-2 text-sm font-medium text-white disabled:opacity-50"
    >
      {pending ? "Adding…" : "Add project"}
    </button>
  );
}

export function NewProjectForm() {
  const [state, action] = useActionState(createProjectAction, undefined);

  return (
    <form action={action} className="flex items-start gap-2">
      <div>
        <input
          name="title"
          placeholder="New project title"
          className="w-56 rounded-md border border-line bg-surface px-3 py-2 text-sm"
        />
        {state?.error ? <p className="mt-1 text-xs text-red-600">{state.error}</p> : null}
      </div>
      <Submit />
    </form>
  );
}
