import type { Metadata } from "next";
import Link from "next/link";
import { switchUserAction } from "@/app/actions";
import { getCurrentUser } from "@/lib/currentUser";
import { listUsers } from "@/lib/db/projects";
import "./globals.css";

export const metadata: Metadata = {
  title: "Portfolio",
  description: "Projects, comments, and an AI assistant",
};

// Every page reads the DB, so nothing here can be statically prerendered.
export const dynamic = "force-dynamic";

async function UserSwitcher() {
  const [users, current] = await Promise.all([listUsers(), getCurrentUser()]);
  if (users.length === 0) return null;
  return (
    <form action={switchUserAction} className="flex items-center gap-2 text-sm">
      <span className="text-muted">Acting as</span>
      <select
        name="userId"
        // Remount on change: React reuses the DOM node across a soft
        // navigation, and an uncontrolled select keeps its old selection.
        key={current?.id}
        defaultValue={current?.id}
        className="rounded-md border border-line bg-surface px-2 py-1"
      >
        {users.map((user) => (
          <option key={user.id} value={user.id}>
            {user.name}
          </option>
        ))}
      </select>
      <button type="submit" className="rounded-md border border-line bg-surface px-2 py-1 hover:bg-ground">
        Switch
      </button>
    </form>
  );
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className="antialiased">
        <header className="border-b border-line bg-surface">
          <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-3">
            <Link href="/" className="font-semibold">
              Portfolio
            </Link>
            <UserSwitcher />
          </div>
        </header>
        <main className="mx-auto max-w-6xl px-6 py-8">{children}</main>
      </body>
    </html>
  );
}
