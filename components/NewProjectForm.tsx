"use client";

import { useActionState, useEffect, useRef } from "react";
import { useFormStatus } from "react-dom";
import { createProjectAction } from "@/app/actions";
import { buttonPrimary, control } from "@/components/ui";

function Submit() {
  const { pending } = useFormStatus();
  return (
    <button type="submit" disabled={pending} className={buttonPrimary}>
      {pending ? "Adding…" : "Add project"}
    </button>
  );
}

export function NewProjectForm() {
  const [state, action] = useActionState(createProjectAction, undefined);
  const formRef = useRef<HTMLFormElement>(null);

  // Clear the title once the project exists; revalidatePath has already put
  // it in the list.
  useEffect(() => {
    if (state && !state.error) formRef.current?.reset();
  }, [state]);

  return (
    <form ref={formRef} action={action} className="flex w-full items-start gap-2 sm:w-auto">
      <div className="min-w-0 flex-1 sm:flex-none">
        <input name="title" placeholder="New project title" aria-label="New project title" className={`${control} w-full sm:w-60`} />
        {state?.error ? <p className="mt-1 text-xs text-red-600">{state.error}</p> : null}
      </div>
      <Submit />
    </form>
  );
}
