# Architecture Decisions

Running log of architecture decisions for the portfolio hiring challenge,
newest first. Each entry records a decision that shapes the app's structure or
the challenge's purpose — not a feature description; see `README.md` for that.

A note on scope: this is a hiring exercise, so "small enough to read in twenty
minutes" is a real constraint and several entries below trade correctness in
the large for legibility in the small. Those are marked.

---

## better-sqlite3 pinned to v12

**Status:** Accepted

**Context:** `better-sqlite3@13` declares `engines: { node: ">=22" }`. On the
Node 20 box this was built on, v13's prebuilt binary **loads successfully and
then segfaults** on the first `new Database()` — exit 139, no error, no stack.
The failure looked like a corrupt build or a sandbox restriction and cost
noticeable time to attribute to the engine constraint, because npm reports it
only as an `EBADENGINE` warning buried in install output.

**Decision:** pin `better-sqlite3` to `^12.11.1`, whose engine range is
`20.x || 22.x || 23.x || 24.x`, and set the Dockerfile to
`node:22-bookworm-slim`. One dependency version now covers every Node a
candidate is plausibly running, and the container and the host do not need to
agree.

**Rejected:** requiring Node 22 locally and keeping v13. A challenge that fails
at `npm install` on a candidate's machine spends their goodwill before they
have read a line of code, and the failure mode here is a segfault rather than a
legible version error.

**Tradeoff accepted:** the pin will need revisiting when v12 stops receiving
SQLite upgrades. The Dockerfile also keeps `python3 make g++` installed so a
node-gyp fallback build can succeed on a platform with no prebuilt binary,
which costs image size that does not matter here.

## Migrate and seed on container start, SQLite in a named volume

**Status:** Accepted

**Context:** the container needs a populated database on first run, and must
not duplicate or destroy data on a rebuild. SQLite's file-per-database model
means the two concerns — schema and contents — have no server to coordinate
them.

**Decision:** `CMD` runs `db:migrate && db:seed && start`. Both are idempotent:
migrations are Drizzle's journal-tracked SQL files, and the seed bails out if
`projects` already has a row. The database file lives at `/data/app.db` in a
named Compose volume, so it survives `docker compose up --build`.

**Rejected:** seeding at build time into the image. The data would then be
baked into a layer and reset on every rebuild, which is the opposite of what a
volume is for. Also rejected: an entrypoint script — a one-line `CMD` is
readable without opening a second file.

**Tradeoff accepted:** migrations run on every boot, which is wrong for a
multi-replica deployment (concurrent migrators on one file). This app is
single-replica by construction and SQLite would not survive the other changes
that horizontal scaling implies, so the shortcut is bounded by a constraint
that is already load-bearing.

## `router.refresh()` after a write tool, form keyed on `updatedAt`

**Status:** Accepted, with a known limit

**Context:** the assistant can change a project the user is looking at. The
chat panel is a client component and the project fields are server-rendered, so
a successful `create_project` or `update_project` leaves stale values on screen
next to a message claiming they changed.

**Decision:** `Assistant.tsx` watches for a `output-available` tool part whose
name is in `WRITE_TOOLS` and calls `router.refresh()` once the turn reaches
`status === "ready"`. `ProjectForm` is keyed on `project.updatedAt`, so the
refresh remounts it and its uncontrolled inputs pick up the new server values
rather than holding the old ones.

**Rejected:** optimistic local state mirroring the tool's return value. It
duplicates the write logic on the client and drifts the moment a tool does
anything the client does not model.

**Tradeoff accepted:** this is a blunt instrument and it discards unsaved edits
in the form when it fires. It is also single-user only — nothing tells this
browser about a write from another one. Both are deliberate: the fix is
per-field reconciliation or a subscription, and neither is worth the code in a
challenge. **Discussion prompt 2 in the README is exactly this.**

## No authentication; a cookie-backed demo user

**Status:** Accepted

**Context:** comments need an author and the assistant needs a meaning for
"my projects". Real auth would be the largest single subsystem in the
repository and would test nothing the challenge is about.

**Decision:** `lib/currentUser.ts` reads a `demo_user_id` cookie set by a
header switcher, falling back to the first seeded user. No passwords, no
sessions, no authorisation checks anywhere.

**Rejected:** hardcoding a single user. Being able to switch makes the comment
thread demonstrate attribution, which is otherwise invisible.

**Tradeoff accepted:** every route is fully public and any user may edit any
project. This is stated in the README's out-of-scope list so a candidate does
not mistake it for an oversight — and "where would authorisation go" is a
better interview question than a `403` that was handed to them.

## Server Components and Server Actions; no REST layer for CRUD

**Status:** Accepted

**Context:** the app needs to read projects, write fields, and post comments.
The obvious shape from habit is a set of `/api/projects` route handlers with
`fetch` calls from client components.

**Decision:** pages are async Server Components calling
`lib/db/projects.ts` directly; mutations are Server Actions in
`app/actions.ts` with Zod validation at the boundary and `revalidatePath` after
the write. The only route handler in the repository is `/api/chat`, which
exists because the AI SDK's streaming transport requires one.

**Rejected:** REST handlers for CRUD. They would add a serialisation boundary,
a second validation site, and client-side fetch state for no gain — nothing
outside this app consumes them.

**Tradeoff accepted:** there is no HTTP API to point an external client or an
integration test at. Acceptable, and it makes the one route handler that does
exist obviously special.

## Assistant tools take names, not ids

**Status:** Accepted — the central decision of the exercise

**Context:** `roadmap`, `goal` and `owner` are foreign keys. The naive tool
schema takes `roadmapId: number`, which forces the model to call a lookup tool,
hold a numeric id across turns, and pass it back correctly. In practice that is
the single largest source of wrong writes: models substitute plausible-looking
ids, reuse an id from earlier in the conversation, or pass the project's id
where a roadmap's belongs.

**Decision:** every write tool takes human names. `resolveByName` maps a name
to an id server-side — exact match first, then unique-substring match. On a
miss the tool **returns the valid options** rather than an error:
`No roadmap named "Q3". Available: Q3 Platform, Q4 Growth, Mobile.` An
ambiguous match lists the candidates. An explicit empty string clears the
field.

**Rejected:** an opaque `{ error: "not found" }`. It costs the whole turn — the
model has nothing to correct itself with and will either retry identically or
invent a value. Returning the option set turns a failed step into a successful
next step, which is worth more than any prompt instruction on the same subject.

**Tradeoff accepted:** the resolver is a heuristic and will mis-resolve on
substring collisions between lookup names. Deliberately left in as
**discussion prompt 3.**

## One data-access layer, shared by the UI and the assistant

**Status:** Accepted

**Context:** the assistant needs to read and write the same records as the UI.
The path of least resistance is for tools to issue their own queries, since
their needs differ slightly from the pages'.

**Decision:** `lib/db/projects.ts` is the only module that touches the
database. Server Components, Server Actions and every AI tool call the same
exported functions. The assistant has **no privileged path of its own**.

**Rejected:** a separate query layer for tools. It is how an AI feature quietly
acquires the ability to write states the UI cannot produce or display — a
status the form has no option for, a null the pages do not render. Sharing the
layer makes that structurally impossible rather than a matter of discipline.

**Tradeoff accepted:** the shared functions carry a slightly wider surface than
either caller needs alone (`ListProjectsFilter` exists mostly for the search
tool). Cheap, and it means a validation rule added there covers both callers at
once.

## Roadmaps and goals are records, not free text

**Status:** Accepted

**Context:** the brief lists `roadmap` and `goal` as fields on a project. The
slimmest reading is two `text` columns.

**Decision:** both are tables with unique names, referenced by foreign key,
seeded with three rows each — following Dragonboat's own model, where a roadmap
is an entity with hierarchy rather than a label.

**Rejected:** text columns. They would make the assistant's job trivial in a
way that hides the interesting problem: with free text there is nothing to
resolve, no ambiguity to surface, and no way for a tool call to be *wrong*
rather than merely odd. The name-to-id resolution above is the substance of the
AI portion of this challenge and it only exists because of this decision.

**Tradeoff accepted:** two extra tables, three extra `<select>`s, and a join in
every list query. Paid gladly.

## Azure via `createOpenAI`, not `createAzure`

**Status:** Accepted

**Context:** Dragonboat's Azure OpenAI resource is configured with Azure's
newer OpenAI-compatible **"v1" surface** — the endpoint already ends in
`/openai/v1/`. `@ai-sdk/azure`'s `createAzure()` targets the classic
`/openai/deployments/<id>` REST shape and will not reach this resource.

**Decision:** `lib/ai/model.ts` uses `@ai-sdk/openai`'s `createOpenAI` with the
endpoint as `baseURL` and the **deployment name as the model id**, mirroring
`dragonboat-ai/lib/azure/client.ts`. Three further settings in
`app/api/chat/route.ts` are load-bearing and were carried over rather than
rediscovered:

- `reasoningEffort: "none"` — Azure's Responses API emits reasoning items that
  400 with `Item 'rs_...' not found` when replayed inside a multi-step tool
  loop.
- `store: false` — the default asks Azure to persist responses under item ids
  this stateless app can never reuse, which then 400.
- `stopWhen: stepCountIs(10)` — the SDK default stops after one step, ending
  the turn on the first tool call, before the model has said anything to the
  user.

**Rejected:** `@ai-sdk/azure` with a rewritten base path. It fights the
provider's URL construction to arrive where `createOpenAI` starts.

**Tradeoff accepted:** the provider named in the code is `openai` while the
service is Azure, which reads as a mistake until you reach the comment. The
comment is therefore not optional, and the same confusion already exists in
`dragonboat-ai` and `dragonboat-api`.

## AI SDK alone; no LangChain

**Status:** Accepted, reversing the original brief

**Context:** the challenge was first specified as "LangChain and AI SDK". The
two do not layer the way that phrasing implies. `@ai-sdk/langchain` bridges in
exactly one direction — a LangChain/LangGraph stream converted into an AI SDK
UI stream — so LangChain runs the agent and AI SDK runs the transport. The
reverse, handing an AI SDK model to a LangChain agent as its LLM, requires a
hand-written `BaseChatModel` subclass and is not supported.

**Decision:** AI SDK only — `streamText` with five `tool()` definitions, and
`useChat` on the client. Dropped LangChain from the brief entirely.

**Rejected:** a LangGraph agent streamed through `@ai-sdk/langchain`, which is
the shape `dragonboat-api` uses. LangGraph earns its complexity through durable
checkpointed state, interrupts and branching; none of those exist here. The
identical behaviour is roughly 40 lines of AI SDK against roughly 120 of
LangGraph. Also rejected: keeping LangChain for one token subsystem so the
requirement is nominally met — a library present for the sake of the job
description teaches a candidate the wrong thing about how this team picks
dependencies.

**Tradeoff accepted:** candidates are no longer exercised on LangChain, which
`dragonboat-api` does use. If that coverage matters more than slimness, the
escape hatch is the rejected option above rather than a redesign — the tool
definitions port directly, and `/api/chat` is the only file that changes
shape.
