import Link from "next/link";
import { Assistant } from "@/components/Assistant";
import { NewProjectForm } from "@/components/NewProjectForm";
import { Avatar, buttonQuiet, control, STATUS_LABEL, StatusBadge } from "@/components/ui";
import { listProjects } from "@/lib/db/projects";
import { projectStatusValues, type ProjectStatus } from "@/lib/db/schema";

export const dynamic = "force-dynamic";

function isStatus(value: string | undefined): value is ProjectStatus {
  return (projectStatusValues as readonly string[]).includes(value ?? "");
}

function href(q: string | undefined, status: ProjectStatus | undefined) {
  const params = new URLSearchParams();
  if (q) params.set("q", q);
  if (status) params.set("status", status);
  const query = params.toString();
  return query ? `/?${query}` : "/";
}

export default async function ProjectsPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; status?: string }>;
}) {
  const { q, status: rawStatus } = await searchParams;
  const status = isStatus(rawStatus) ? rawStatus : undefined;

  // One query for the search, filtered here so the chips can show counts for
  // every status at once. The data layer stays the only thing that reads rows.
  const matches = await listProjects({ query: q });
  const projects = status ? matches.filter((project) => project.status === status) : matches;
  const counts = Object.fromEntries(
    projectStatusValues.map((value) => [value, matches.filter((project) => project.status === value).length]),
  ) as Record<ProjectStatus, number>;

  const filtered = Boolean(q || status);

  return (
    <div className="grid items-start gap-6 lg:grid-cols-[minmax(0,1fr)_22rem]">
      <div className="space-y-5">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <h1 className="text-2xl font-semibold tracking-tight">Projects</h1>
            <p className="mt-1 text-sm text-muted">
              {status ? `${projects.length} of ${matches.length}` : matches.length}{" "}
              {matches.length === 1 ? "project" : "projects"}
              {q ? (
                <>
                  {" "}
                  matching <span className="font-medium text-ink">“{q}”</span>
                </>
              ) : null}
            </p>
          </div>
          <NewProjectForm />
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <form className="flex min-w-0 flex-1 gap-2" role="search">
            {status ? <input type="hidden" name="status" value={status} /> : null}
            <input
              type="search"
              name="q"
              defaultValue={q ?? ""}
              placeholder="Search title and details"
              aria-label="Search projects"
              className={`${control} w-full max-w-sm`}
            />
            <button type="submit" className={buttonQuiet}>
              Search
            </button>
          </form>
          {filtered ? (
            <Link href="/" className="text-sm text-muted underline-offset-4 hover:text-ink hover:underline">
              Clear
            </Link>
          ) : null}
        </div>

        <nav aria-label="Filter by status" className="flex flex-wrap gap-1.5">
          <Chip href={href(q, undefined)} active={!status}>
            All <Count n={matches.length} />
          </Chip>
          {projectStatusValues.map((value) => (
            <Chip key={value} href={href(q, value)} active={status === value}>
              {STATUS_LABEL[value]} <Count n={counts[value]} />
            </Chip>
          ))}
        </nav>

        {projects.length === 0 ? (
          <div className="rounded-lg border border-dashed border-line-strong bg-surface px-6 py-12 text-center">
            <p className="text-sm font-medium">No projects here</p>
            <p className="mt-1 text-sm text-muted">
              {filtered ? "Try a different search or clear the filter." : "Add one above, or ask the assistant to create it."}
            </p>
          </div>
        ) : (
          <div className="overflow-hidden rounded-lg border border-line bg-surface">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-line text-left text-[11px] font-medium uppercase tracking-[0.08em] text-muted">
                  <th className="px-4 py-2.5 font-medium">Project</th>
                  <th className="hidden px-4 py-2.5 font-medium sm:table-cell">Roadmap</th>
                  <th className="hidden px-4 py-2.5 font-medium md:table-cell">Owner</th>
                  <th className="px-4 py-2.5 font-medium">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-line">
                {projects.map((project) => (
                  <tr key={project.id} className="group relative transition-colors hover:bg-ground">
                    <td className="px-4 py-3">
                      <Link
                        href={`/projects/${project.id}`}
                        className="font-medium text-ink after:absolute after:inset-0 after:content-['']"
                      >
                        {project.title}
                      </Link>
                      {project.goal ? <div className="mt-0.5 text-xs text-muted">{project.goal}</div> : null}
                    </td>
                    <td className="hidden px-4 py-3 text-muted sm:table-cell">
                      {project.roadmap ?? <span className="text-faint">—</span>}
                    </td>
                    <td className="hidden px-4 py-3 md:table-cell">
                      <span className="flex items-center gap-2 text-muted">
                        <Avatar name={project.owner} size="xs" />
                        <span className="truncate">{project.owner ?? "Unassigned"}</span>
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <StatusBadge status={project.status} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
      <Assistant />
    </div>
  );
}

function Chip({ href, active, children }: { href: string; active: boolean; children: React.ReactNode }) {
  return (
    <Link
      href={href}
      aria-current={active ? "page" : undefined}
      className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs font-medium transition-colors ${
        active
          ? "border-ink bg-ink text-white"
          : "border-line bg-surface text-muted hover:border-line-strong hover:text-ink"
      }`}
    >
      {children}
    </Link>
  );
}

function Count({ n }: { n: number }) {
  return <span className="font-mono text-[11px] opacity-70">{n}</span>;
}
