# Portfolio — hiring code challenge

A deliberately small portfolio tool: a list of projects, a detail view with a
comment thread, and an AI assistant that can find, create and update projects
by calling tools against the same data layer the UI uses.

The domain is a thin slice of [Dragonboat](https://dragonboat.io): a *project*
stands in for a portfolio item, and roadmaps and goals are real records rather
than free text on the project.

## Stack

| Concern | Choice |
| --- | --- |
| Framework | Next.js 15, App Router, React 19, Server Components + Server Actions |
| Styling | Tailwind v4 |
| Database | SQLite via `better-sqlite3`, schema and migrations in Drizzle |
| AI | Vercel AI SDK v6 (`streamText` + `tool`), `useChat` on the client |
| Model | Azure OpenAI |
| Packaging | Docker + Docker Compose |

## Running it

### Docker (recommended)

```bash
cp .env.example .env     # fill in the three AZURE_OPENAI_* values
docker compose up --build
```

http://localhost:3000. The container migrates and seeds on start; both are
idempotent, and the SQLite file lives in a named volume so it survives a
rebuild.

### Locally

Requires Node 20 or newer.

```bash
npm install
cp .env.example .env.local
npm run db:migrate
npm run db:seed
npm run dev
```

`npm run db:reset` throws the database away and rebuilds it from the seed.

### Azure configuration

Dragonboat's Azure OpenAI resource exposes Azure's newer OpenAI-compatible
"v1" surface — the endpoint already ends in `/openai/v1/`. That is *not* the
classic `/openai/deployments/<id>` shape that `@ai-sdk/azure`'s `createAzure()`
targets, so `lib/ai/model.ts` uses `@ai-sdk/openai`'s `createOpenAI` with the
endpoint as `baseURL` and the deployment name as the model id. Same approach as
`dragonboat-ai/lib/azure/client.ts`.

```
AZURE_OPENAI_ENDPOINT=https://<resource>.openai.azure.com/openai/v1
AZURE_OPENAI_API_KEY=...
AZURE_OPENAI_DEPLOYMENT=<deployment name, used as the model id>
```

Everything except the assistant works without these set.

## What's in it

**Projects list** (`/`) — searchable over title and details, with an inline
create box.

**Project detail** (`/projects/[id]`) — the five fields (title, details,
roadmap, goal, user) plus status, saved through a Server Action, and the
comment thread below it. Comments are attributed to the current user.

**Current user** — there is no auth. The header switches between seeded users
via a cookie; it exists so comments have an author and so the assistant can
resolve "my projects".

**Assistant** — a side panel on both pages. It streams, shows each tool call as
it happens, and calls `router.refresh()` after a turn that wrote something, so
the page beside it reflects the change without a manual reload.

## How the assistant is wired

`app/api/chat/route.ts` is the whole server side: parse, build tools, call
`streamText`, return `toUIMessageStreamResponse()`. Five tools in
`lib/ai/tools.ts`:

| Tool | Purpose |
| --- | --- |
| `find_projects` | Search by free text, status, roadmap, goal, owner |
| `get_project` | One project in full, including its comments |
| `list_options` | The exact roadmap / goal / user names that exist |
| `create_project` | Create; only title is required |
| `update_project` | Patch by id; only the fields passed are touched |

Three decisions worth calling out, since they're the ones that make the
difference between an assistant that works and one that mostly works:

**Tools take names, not ids.** The model is never asked to remember that
"Q3 Platform" is roadmap `1`. It passes the name and `resolveByName` maps it to
a foreign key. Asking a model to carry numeric ids across turns is the single
biggest source of wrong writes.

**A failed lookup returns the valid options.** `No roadmap named "Q3". Available:
Q3 Platform, Q4 Growth, Mobile.` — so the model self-corrects on the next step
instead of inventing an id or giving up. An opaque error wastes the whole turn.

**`stopWhen: stepCountIs(10)`.** The AI SDK default stops after one step, which
ends the turn on the first tool call before the model has said anything to the
user. Ten leaves room for search → resolve → write → summarise, plus a recovery
from a bad name.

Two Azure-specific settings in the same file are load-bearing:
`reasoningEffort: "none"` and `store: false`. Azure's Responses API emits
reasoning items that 400 with `Item 'rs_...' not found` when replayed inside a
multi-step tool loop, and its default `store: true` asks Azure to persist
responses under item ids this stateless app can never reuse.

## Layout

```
app/
  page.tsx                 projects list + assistant
  projects/[id]/page.tsx   detail: fields, comments, assistant
  actions.ts               server actions (save, create, comment, switch user)
  api/chat/route.ts        streamText + tools
components/                Assistant, ProjectForm, CommentThread, NewProjectForm
lib/
  db/schema.ts             drizzle schema
  db/projects.ts           the ONLY data-access layer
  ai/tools.ts              the five assistant tools
  ai/model.ts              Azure provider
  currentUser.ts           cookie-backed demo user
scripts/                   migrate, seed
drizzle/                   generated migrations
```

The important structural point: **`lib/db/projects.ts` is the only way to touch
data.** The UI and the assistant's tools both go through it. The assistant has
no privileged path of its own, so a tool cannot write a shape the UI couldn't
produce — and any validation added there covers both callers at once.

Why AI SDK alone and not LangChain, why roadmaps are records rather than text,
and why the assistant shares the UI's data layer are all recorded in
[`ADR.md`](ADR.md).

## Deliberately out of scope

Auth and authorisation, multi-tenancy, optimistic UI, pagination, project
hierarchy, permissions on who may edit what, and tests. Each is a real
requirement in the product and none of them is what this challenge is probing.

## Things worth discussing

Prompts for a conversation with a candidate, not a checklist:

1. The assistant writes to the database with no confirmation step. Where would
   you put a "are you sure?" gate, and what changes in the tool contract to
   support it?
2. `router.refresh()` after a write is a blunt instrument. What breaks if two
   people are on the same project, and what would you do instead?
3. `resolveByName` does exact match, then unique-substring match, then gives
   up. Where does that heuristic bite, and what would you replace it with?
4. Comments are plain rows with no threading or mentions. What's the smallest
   schema change that supports replies without a migration that rewrites the
   table?
5. Nothing here is tested. Which three tests would you write first, and why
   those three?
