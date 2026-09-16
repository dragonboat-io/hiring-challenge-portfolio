"use client";

import { useActionState, useEffect, useRef } from "react";
import { useFormStatus } from "react-dom";
import { addCommentAction, type FormState } from "@/app/actions";
import { Avatar, buttonPrimary, control, fullTime, relativeTime } from "@/components/ui";

export interface CommentRow {
  id: number;
  body: string;
  createdAt: string;
  author: string | null;
}

function Submit() {
  const { pending } = useFormStatus();
  return (
    <button type="submit" disabled={pending} className={buttonPrimary}>
      {pending ? "Posting…" : "Post comment"}
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
    <section aria-labelledby="comments-heading" className="space-y-4">
      <h2 id="comments-heading" className="flex items-baseline gap-2 text-sm font-semibold">
        Comments
        <span className="font-mono text-xs font-normal text-muted">{comments.length}</span>
      </h2>

      {comments.length === 0 ? (
        <p className="rounded-lg border border-dashed border-line-strong bg-surface px-4 py-6 text-center text-sm text-muted">
          No comments yet. Start the thread below.
        </p>
      ) : (
        <ol className="space-y-px overflow-hidden rounded-lg border border-line bg-line">
          {comments.map((comment) => (
            <li key={comment.id} className="flex gap-3 bg-surface px-4 py-3">
              <Avatar name={comment.author} />
              <div className="min-w-0 flex-1">
                <div className="flex items-baseline justify-between gap-3">
                  <span className="text-sm font-medium">{comment.author ?? "Unknown"}</span>
                  <time
                    dateTime={comment.createdAt}
                    title={fullTime(comment.createdAt)}
                    suppressHydrationWarning
                    className="shrink-0 font-mono text-[11px] text-muted"
                  >
                    {relativeTime(comment.createdAt)}
                  </time>
                </div>
                <p className="mt-1 whitespace-pre-wrap text-sm leading-relaxed">{comment.body}</p>
              </div>
            </li>
          ))}
        </ol>
      )}

      <form ref={formRef} action={formAction} className="flex flex-col gap-2 rounded-lg border border-line bg-surface p-3">
        <textarea
          name="body"
          rows={3}
          placeholder="Add a comment"
          aria-label="Add a comment"
          className={`${control} resize-y border-transparent bg-transparent px-1 py-1 hover:border-transparent focus:border-transparent focus:ring-0`}
        />
        <div className="flex items-center justify-between gap-3 border-t border-line pt-3">
          <span className="text-xs text-red-600">{state?.error ?? ""}</span>
          <Submit />
        </div>
      </form>
    </section>
  );
}
