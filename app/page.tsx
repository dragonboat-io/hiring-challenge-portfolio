import Link from "next/link";
import { Assistant } from "@/components/Assistant";
import { NewProjectForm } from "@/components/NewProjectForm";
import { StatusBadge } from "@/components/ui";
import { listProjects } from "@/lib/db/projects";

export const dynamic = "force-dynamic";

export default async function ProjectsPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string }>;
}) {
  const { q } = await searchParams;
  const projects = await listProjects({ query: q });

  return (
    <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_22rem]">
      <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <h1 className="text-2xl font-semibold">Projects</h1>
        <NewProjectForm />
      </div>

      <form className="flex gap-2">
        <input
          type="search"
          name="q"
          defaultValue={q ?? ""}
          placeholder="Search title and details…"
          className="w-full max-w-sm rounded-md border border-line bg-surface px-3 py-2 text-sm"
        />
        <button type="submit" className="rounded-md border border-line bg-surface px-3 py-2 text-sm hover:bg-ground">
          Search
        </button>
      </form>

      {projects.length === 0 ? (
        <p className="rounded-lg border border-line bg-surface p-8 text-center text-sm text-muted">
          No projects{q ? ` matching “${q}”` : ""} yet.
        </p>
      ) : (
        <ul className="divide-y divide-line overflow-hidden rounded-lg border border-line bg-surface">
          {projects.map((project) => (
            <li key={project.id}>
              <Link href={`/projects/${project.id}`} className="flex items-center gap-4 px-4 py-3 hover:bg-ground">
                <span className="flex-1 font-medium">{project.title}</span>
                <span className="hidden text-sm text-muted sm:inline">{project.roadmap ?? "—"}</span>
                <span className="hidden w-32 truncate text-sm text-muted md:inline">{project.owner ?? "Unassigned"}</span>
                <StatusBadge status={project.status} />
              </Link>
            </li>
          ))}
        </ul>
      )}
      </div>
      <Assistant />
    </div>
  );
}
