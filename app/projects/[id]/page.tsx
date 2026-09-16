import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Assistant } from "@/components/Assistant";
import { CommentThread } from "@/components/CommentThread";
import { ProjectForm } from "@/components/ProjectForm";
import { getProject, listComments, listGoals, listRoadmaps, listUsers } from "@/lib/db/projects";

export const dynamic = "force-dynamic";

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }): Promise<Metadata> {
  const id = Number((await params).id);
  const project = Number.isInteger(id) ? await getProject(id) : null;
  return { title: project?.title ?? "Project" };
}

export default async function ProjectPage({ params }: { params: Promise<{ id: string }> }) {
  const id = Number((await params).id);
  if (!Number.isInteger(id)) notFound();

  const project = await getProject(id);
  if (!project) notFound();

  const [comments, roadmaps, goals, users] = await Promise.all([
    listComments(id),
    listRoadmaps(),
    listGoals(),
    listUsers(),
  ]);

  return (
    <div className="grid items-start gap-6 lg:grid-cols-[minmax(0,1fr)_22rem]">
      <div className="space-y-8">
        <nav aria-label="Breadcrumb" className="flex items-center gap-2 text-sm text-muted">
          <Link href="/" className="underline-offset-4 hover:text-ink hover:underline">
            Projects
          </Link>
          <span aria-hidden className="text-faint">/</span>
          <span className="truncate text-ink">{project.title}</span>
        </nav>

        <ProjectForm project={project} roadmaps={roadmaps} goals={goals} users={users} />
        <CommentThread projectId={id} comments={comments} />
      </div>
      <Assistant />
    </div>
  );
}
