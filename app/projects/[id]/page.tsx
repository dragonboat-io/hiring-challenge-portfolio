import Link from "next/link";
import { notFound } from "next/navigation";
import { Assistant } from "@/components/Assistant";
import { CommentThread } from "@/components/CommentThread";
import { ProjectForm } from "@/components/ProjectForm";
import { getProject, listComments, listGoals, listRoadmaps, listUsers } from "@/lib/db/projects";

export const dynamic = "force-dynamic";

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
    <div className="space-y-6">
      <Link href="/" className="text-sm text-muted hover:underline">
        ← All projects
      </Link>

      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_22rem]">
        <div className="space-y-8">
          <ProjectForm project={project} roadmaps={roadmaps} goals={goals} users={users} />
          <CommentThread projectId={id} comments={comments} />
        </div>
        <Assistant />
      </div>
    </div>
  );
}
