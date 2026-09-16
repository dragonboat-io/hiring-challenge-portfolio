import { convertToModelMessages, stepCountIs, streamText, type UIMessage } from "ai";
import { NextResponse } from "next/server";
import { z } from "zod";
import { getChatModel } from "@/lib/ai/model";
import { buildSystemPrompt } from "@/lib/ai/systemPrompt";
import { buildAssistantTools } from "@/lib/ai/tools";
import { getCurrentUser } from "@/lib/currentUser";

export const maxDuration = 60;

/** Enough for search -> resolve -> write -> summarise, with room to recover from a bad name. */
const MAX_STEPS = 10;

const requestSchema = z.object({
  messages: z.array(z.custom<UIMessage>()),
});

export async function POST(request: Request) {
  const parsed = requestSchema.safeParse(await request.json());
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid request body" }, { status: 400 });
  }

  const user = await getCurrentUser();
  const tools = buildAssistantTools();

  const result = streamText({
    model: getChatModel(),
    system: buildSystemPrompt(user?.name ?? null),
    messages: await convertToModelMessages(parsed.data.messages, { tools }),
    tools,
    // The default (stop after one step) would end the turn on the first tool
    // call, before the model has said anything to the user.
    stopWhen: stepCountIs(MAX_STEPS),
    providerOptions: {
      openai: {
        // Azure's Responses API emits reasoning items that 400 ("Item 'rs_...'
        // not found") when replayed inside a multi-step tool loop, and its
        // default store:true asks Azure to persist responses by item id that
        // this stateless app can never reuse. Both off. (Same workaround as
        // dragonboat-ai's lib/agent/run.ts.)
        reasoningEffort: process.env.AZURE_OPENAI_REASONING_EFFORT || "none",
        store: false,
      },
    },
    onError: ({ error }) => {
      console.error("streamText error", error);
    },
  });

  return result.toUIMessageStreamResponse();
}
