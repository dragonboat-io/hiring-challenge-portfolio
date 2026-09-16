"use client";

import { useActionState, useEffect, useRef } from "react";
import { useFormStatus } from "react-dom";
import { addCommentAction, type FormState } from "@/app/actions";

export interface CommentRow {
  id: number;
  body: string;
  createdAt: string;
  author: string | null;
}

function Submit() {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      disabled={pending}
      className="self-end rounded-md bg-ink px-3 py-1.5 text-sm font-medium text-white disabled:opacity-50"
    >
      {pending ? "Posting…" : "Comment"}
    </button>
  );
}

export function CommentThread({ projectId, comments }: { projectId: number; comments: CommentRow[] }) {
  const action = addCommentAction.bind(null, projectId);
  const [state, formAction] = useActionState<FormState, FormData>(action, undefined);
  const formRef = useRef<HTMLFormElement>(null);

  // Clear the box once the action came back clean; revalidatePath has already
  // pushed the new comment into the list above.
  useEffect(() => {
    if (state && !state.error) formRef.current?.reset();
  }, [state]);

  return (
    <section className="space-y-4">
      <h2 className="text-sm font-semibold uppercase tracking-wide text-muted">Comments ({comments.length})</h2>

      <ul className="space-y-3">
        {comments.map((comment) => (
          <li key={comment.id} className="rounded-lg border border-line bg-surface p-3">
            <div className="flex items-baseline justify-between gap-2">
              <span className="text-sm font-medium">{comment.author ?? "Unknown"}</span>
              <time className="text-xs text-muted">{comment.createdAt}</time>
            </div>
            <p className="mt-1 whitespace-pre-wrap text-sm">{comment.body}</p>
          </li>
        ))}
        {comments.length === 0 ? <li className="text-sm text-muted">No comments yet.</li> : null}
      </ul>

      <form ref={formRef} action={formAction} className="flex flex-col gap-2">
        <textarea
          name="body"
          rows={3}
          placeholder="Add a comment…"
          className="rounded-md border border-line bg-surface px-3 py-2 text-sm"
        />
        {state?.error ? <p className="text-xs text-red-600">{state.error}</p> : null}
        <Submit />
      </form>
    </section>
  );
}
