"use client";

import { useChat } from "@ai-sdk/react";
import { DefaultChatTransport, getToolOrDynamicToolName, isToolOrDynamicToolUIPart } from "ai";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";

/** Tools that change data — a successful call means the page behind the panel is stale. */
const WRITE_TOOLS = new Set(["create_project", "update_project"]);

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
    <aside className="flex h-[36rem] flex-col rounded-lg border border-line bg-surface">
      <header className="border-b border-line px-4 py-3">
        <h2 className="text-sm font-semibold">Assistant</h2>
        <p className="text-xs text-muted">Find projects, or create and update them.</p>
      </header>

      <div ref={scrollRef} className="flex-1 space-y-3 overflow-y-auto px-4 py-3">
        {messages.length === 0 ? (
          <div className="space-y-2">
            {SUGGESTIONS.map((suggestion) => (
              <button
                key={suggestion}
                onClick={() => submit(suggestion)}
                className="block w-full rounded-md border border-line px-3 py-2 text-left text-xs text-muted hover:bg-ground"
              >
                {suggestion}
              </button>
            ))}
          </div>
        ) : null}

        {messages.map((message) => (
          <div key={message.id} className={message.role === "user" ? "text-right" : ""}>
            {message.parts.map((part, index) => {
              if (part.type === "text") {
                return (
                  <p
                    key={index}
                    className={`inline-block max-w-[90%] whitespace-pre-wrap rounded-lg px-3 py-2 text-sm ${
                      message.role === "user" ? "bg-ink text-white" : "bg-ground"
                    }`}
                  >
                    {part.text}
                  </p>
                );
              }
              if (isToolOrDynamicToolUIPart(part)) {
                const name = getToolOrDynamicToolName(part);
                const done = part.state === "output-available";
                const failed = part.state === "output-error";
                return (
                  <p key={index} className="text-xs text-muted">
                    <span className="font-mono">{name}</span>{" "}
                    {failed ? "failed" : done ? "✓" : "…"}
                  </p>
                );
              }
              return null;
            })}
          </div>
        ))}

        {isBusy ? <p className="text-xs text-muted">Thinking…</p> : null}
        {error ? <p className="text-xs text-red-600">{error.message}</p> : null}
      </div>

      <form
        onSubmit={(event) => {
          event.preventDefault();
          submit(input);
        }}
        className="flex gap-2 border-t border-line p-3"
      >
        <input
          value={input}
          onChange={(event) => setInput(event.target.value)}
          placeholder="Ask about projects…"
          className="flex-1 rounded-md border border-line px-3 py-2 text-sm"
        />
        <button
          type="submit"
          disabled={isBusy || !input.trim()}
          className="rounded-md bg-ink px-3 py-2 text-sm font-medium text-white disabled:opacity-40"
        >
          Send
        </button>
      </form>
    </aside>
  );
}
