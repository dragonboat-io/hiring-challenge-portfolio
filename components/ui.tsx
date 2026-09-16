import type { ProjectStatus } from "@/lib/db/schema";

export const STATUS_LABEL: Record<ProjectStatus, string> = {
  idea: "Idea",
  planned: "Planned",
  in_progress: "In progress",
  shipped: "Shipped",
};

/** Dot colour per status. The label stays ink so colour is a cue, not the message. */
const STATUS_DOT: Record<ProjectStatus, string> = {
  idea: "bg-faint",
  planned: "bg-accent",
  in_progress: "bg-amber-500",
  shipped: "bg-emerald-500",
};

export function StatusBadge({ status }: { status: ProjectStatus }) {
  return (
    <span className="inline-flex items-center gap-1.5 whitespace-nowrap text-sm text-ink">
      <span aria-hidden className={`size-2 rounded-full ${STATUS_DOT[status]}`} />
      {STATUS_LABEL[status]}
    </span>
  );
}

/* Four muted fills, picked by name so the same person always gets the same one. */
const AVATAR_FILL = [
  "bg-well text-ink",
  "bg-accent-soft text-accent",
  "bg-amber-100 text-amber-900",
  "bg-emerald-100 text-emerald-900",
];

export function initials(name: string) {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]!.toUpperCase())
    .join("");
}

export function Avatar({ name, size = "sm" }: { name: string | null; size?: "sm" | "xs" }) {
  const label = name ?? "Unassigned";
  const hash = [...label].reduce((sum, ch) => sum + ch.charCodeAt(0), 0);
  const fill = name ? AVATAR_FILL[hash % AVATAR_FILL.length] : "bg-ground text-faint ring-1 ring-inset ring-line";
  const dims = size === "sm" ? "size-6 text-[11px]" : "size-5 text-[10px]";
  return (
    <span
      title={label}
      aria-hidden
      className={`inline-flex shrink-0 items-center justify-center rounded-full font-medium tracking-wide ${dims} ${fill}`}
    >
      {name ? initials(name) : "–"}
    </span>
  );
}

/** SQLite's current_timestamp is UTC "YYYY-MM-DD HH:MM:SS". */
export function parseDbTime(value: string) {
  return new Date(value.includes("T") ? value : `${value.replace(" ", "T")}Z`);
}

export function relativeTime(value: string, now = Date.now()) {
  const then = parseDbTime(value).getTime();
  const seconds = Math.round((now - then) / 1000);
  if (seconds < 45) return "just now";
  const minutes = Math.round(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.round(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.round(hours / 24);
  if (days < 7) return `${days}d ago`;
  return parseDbTime(value).toLocaleDateString(undefined, { month: "short", day: "numeric" });
}

export function fullTime(value: string) {
  return parseDbTime(value).toLocaleString(undefined, {
    dateStyle: "medium",
    timeStyle: "short",
  });
}

/** Shared control chrome so inputs, selects and textareas read as one family. */
export const control =
  "rounded-md border border-line bg-surface px-3 py-2 text-sm text-ink placeholder:text-faint transition-colors hover:border-line-strong focus:border-accent focus:outline-none focus:ring-2 focus:ring-accent/20";

export const buttonPrimary =
  "inline-flex items-center justify-center whitespace-nowrap rounded-md bg-ink px-3.5 py-2 text-sm font-medium text-white transition-colors hover:bg-ink/90 disabled:cursor-not-allowed disabled:opacity-40";

export const buttonQuiet =
  "inline-flex items-center justify-center whitespace-nowrap rounded-md border border-line bg-surface px-3 py-2 text-sm text-ink transition-colors hover:border-line-strong hover:bg-ground";

export function FieldLabel({ children }: { children: React.ReactNode }) {
  return <span className="text-[11px] font-medium uppercase tracking-[0.08em] text-muted">{children}</span>;
}
