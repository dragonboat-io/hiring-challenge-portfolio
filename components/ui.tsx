import type { ProjectStatus } from "@/lib/db/schema";

const STATUS_LABEL: Record<ProjectStatus, string> = {
  idea: "Idea",
  planned: "Planned",
  in_progress: "In progress",
  shipped: "Shipped",
};

const STATUS_CLASS: Record<ProjectStatus, string> = {
  idea: "bg-slate-100 text-slate-700",
  planned: "bg-sky-100 text-sky-800",
  in_progress: "bg-amber-100 text-amber-800",
  shipped: "bg-emerald-100 text-emerald-800",
};

export function StatusBadge({ status }: { status: ProjectStatus }) {
  return (
    <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${STATUS_CLASS[status]}`}>
      {STATUS_LABEL[status]}
    </span>
  );
}

export function Field({ label, value }: { label: string; value: string | null }) {
  return (
    <div>
      <dt className="text-xs uppercase tracking-wide text-muted">{label}</dt>
      <dd className="mt-0.5 text-sm">{value ?? <span className="text-muted">—</span>}</dd>
    </div>
  );
}
