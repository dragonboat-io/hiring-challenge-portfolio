"use client";

import { useChat } from "@ai-sdk/react";
import { DefaultChatTransport, getToolOrDynamicToolName, isToolOrDynamicToolUIPart, type UIMessage } from "ai";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { buttonPrimary, control } from "@/components/ui";

/** Tools that change data — a successful call means the page behind the panel is stale. */
const WRITE_TOOLS = new Set(["create_project", "update_project"]);

/**
 * The trace is the point of this panel: the assistant works the same data the
 * page does, and the user should be able to read what it did. Each tool gets
 * a plain verb; the input picks out the one detail worth showing.
 */
const TOOL_LINE: Record<string, { pending: string; done: string; detail?: (input: Record<string, unknown>) => string | null }> = {
  find_projects: {
    pending: "Searching projects",
    done: "Searched projects",
    detail: (input) => summarise(input, ["query", "status", "roadmap", "goal", "owner"]),
  },
  get_project: { pending: "Opening project", done: "Opened project", detail: (input) => str(input.id && `#${input.id}`) },
  list_options: { pending: "Checking names", done: "Checked roadmap, goal and owner names" },
  create_project: { pending: "Creating project", done: "Created project", detail: (input) => str(input.title) },
  update_project: {
    pending: "Updating project",
    done: "Updated project",
    detail: (input) => summarise(input, ["title", "status", "roadmap", "goal", "owner"]),
  },
};

function str(value: unknown) {
  return typeof value === "string" && value.trim() ? value : null;
}

function summarise(input: Record<string, unknown>, keys: string[]) {
  const parts = keys.map((key) => str(input[key])).filter((v): v is string => Boolean(v));
  return parts.length ? parts.join(" · ") : null;
}

const SUGGESTIONS = [
  "Which projects are in progress?",
  "Create a project called Billing export on the Q3 Platform roadmap",
  "Move the onboarding project to shipped",
];

export function Assistant() {
  const router = useRouter();
  const [input, setInput] = useState("");
  const scrollRef = useRef<HTMLDivElement>(null);

  const { messages, sendMessage, status, error } = useChat({
    transport: new DefaultChatTransport({ api: "/api/chat" }),
  });

  const isBusy = status === "submitted" || status === "streaming";

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight });
  }, [messages]);

  // Pull the server components back in once a turn that wrote something ends,
  // so the project list/detail next to the panel shows the assistant's change.
  useEffect(() => {
    if (status !== "ready") return;
    const wrote = messages.some((message) =>
      message.parts.some(
        (part) =>
          isToolOrDynamicToolUIPart(part) &&
          part.state === "output-available" &&
          WRITE_TOOLS.has(getToolOrDynamicToolName(part)),
      ),
    );
    if (wrote) router.refresh();
  }, [status, messages, router]);

  function submit(text: string) {
    const trimmed = text.trim();
    if (!trimmed || isBusy) return;
    setInput("");
    void sendMessage({ text: trimmed });
  }

  return (
    <aside
      aria-label="Assistant"
      className="flex flex-col overflow-hidden rounded-lg border border-line bg-surface lg:sticky lg:top-[5.5rem] lg:h-[calc(100vh-7.5rem)] lg:min-h-[28rem]"
    >
      <header className="flex items-center gap-2.5 border-b border-line px-4 py-3">
        <span aria-hidden className="relative flex size-2">
          <span className={`absolute inset-0 rounded-full bg-accent ${isBusy ? "animate-ping opacity-60" : "hidden"}`} />
          <span className={`relative size-2 rounded-full ${isBusy ? "bg-accent" : "bg-emerald-500"}`} />
        </span>
        <div className="min-w-0">
          <h2 className="text-sm font-semibold leading-tight">Assistant</h2>
          <p className="truncate text-xs text-muted">Finds, creates and updates projects for you.</p>
        </div>
      </header>

      <div ref={scrollRef} className="flex-1 space-y-4 overflow-y-auto px-4 py-4">
        {messages.length === 0 ? (
          <div className="space-y-2">
            <p className="px-1 text-xs text-muted">Try one of these, or ask in your own words.</p>
            {SUGGESTIONS.map((suggestion) => (
              <button
                key={suggestion}
                onClick={() => submit(suggestion)}
                className="block w-full rounded-md border border-line px-3 py-2 text-left text-sm text-ink transition-colors hover:border-line-strong hover:bg-ground"
              >
                {suggestion}
              </button>
            ))}
          </div>
        ) : null}

        {messages.map((message) => (
          <Message key={message.id} message={message} />
        ))}

        {isBusy && !lastAssistantHasText(messages) ? (
          <p className="animate-rise text-xs text-muted">Thinking…</p>
        ) : null}
        {error ? (
          <p className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-700">
            The assistant hit an error: {error.message}
          </p>
        ) : null}
      </div>

      <form
        onSubmit={(event) => {
          event.preventDefault();
          submit(input);
        }}
        className="flex gap-2 border-t border-line bg-ground/60 p-3"
      >
        <input
          value={input}
          onChange={(event) => setInput(event.target.value)}
          placeholder="Ask about projects"
          aria-label="Message the assistant"
          className={`${control} flex-1`}
        />
        <button type="submit" disabled={isBusy || !input.trim()} className={buttonPrimary}>
          Send
        </button>
      </form>
    </aside>
  );
}

function lastAssistantHasText(messages: UIMessage[]) {
  const last = messages[messages.length - 1];
  return last?.role === "assistant" && last.parts.some((part) => part.type === "text" && part.text.length > 0);
}

function Message({ message }: { message: UIMessage }) {
  if (message.role === "user") {
    return (
      <div className="flex justify-end">
        {message.parts.map((part, index) =>
          part.type === "text" ? (
            <p
              key={index}
              className="animate-rise max-w-[88%] whitespace-pre-wrap rounded-lg rounded-br-sm bg-ink px-3 py-2 text-sm text-white"
            >
              {part.text}
            </p>
          ) : null,
        )}
      </div>
    );
  }

  return (
    <div className="animate-rise space-y-2">
      {message.parts.map((part, index) => {
        if (part.type === "text") {
          if (!part.text) return null;
          return (
            <p key={index} className="whitespace-pre-wrap text-sm leading-relaxed text-ink">
              {part.text}
            </p>
          );
        }
        if (isToolOrDynamicToolUIPart(part)) {
          const name = getToolOrDynamicToolName(part);
          const line = TOOL_LINE[name] ?? { pending: name, done: name };
          const done = part.state === "output-available";
          const failed = part.state === "output-error";
          const input = (part.input ?? {}) as Record<string, unknown>;
          const detail = line.detail?.(input) ?? null;
          const write = WRITE_TOOLS.has(name);
          return (
            <div
              key={index}
              className={`flex items-start gap-2 border-l-2 pl-3 text-xs ${
                failed ? "border-red-300" : write && done ? "border-accent" : "border-line"
              }`}
            >
              <span
                aria-hidden
                className={`mt-[3px] size-1.5 shrink-0 rounded-full ${
                  failed ? "bg-red-500" : done ? (write ? "bg-accent" : "bg-emerald-500") : "animate-pulse bg-faint"
                }`}
              />
              <span className="min-w-0">
                <span className={failed ? "text-red-700" : "text-ink"}>
                  {failed ? `${line.pending} failed` : done ? line.done : `${line.pending}…`}
                </span>
                {detail ? <span className="ml-1.5 font-mono text-muted">{detail}</span> : null}
              </span>
            </div>
          );
        }
        return null;
      })}
    </div>
  );
}
