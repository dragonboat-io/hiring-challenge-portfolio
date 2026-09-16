import type { Metadata } from "next";
import { IBM_Plex_Mono, IBM_Plex_Sans } from "next/font/google";
import Link from "next/link";
import { switchUserAction } from "@/app/actions";
import { Avatar, buttonQuiet } from "@/components/ui";
import { getCurrentUser } from "@/lib/currentUser";
import { listUsers } from "@/lib/db/projects";
import "./globals.css";

const sans = IBM_Plex_Sans({
  subsets: ["latin"],
  weight: ["400", "500", "600"],
  variable: "--font-plex-sans",
  display: "swap",
});

const mono = IBM_Plex_Mono({
  subsets: ["latin"],
  weight: ["400", "500"],
  variable: "--font-plex-mono",
  display: "swap",
});

export const metadata: Metadata = {
  title: { default: "Portfolio", template: "%s · Portfolio" },
  description: "Projects, comments, and an AI assistant",
};

// Every page reads the DB, so nothing here can be statically prerendered.
export const dynamic = "force-dynamic";

async function UserSwitcher() {
  const [users, current] = await Promise.all([listUsers(), getCurrentUser()]);
  if (users.length === 0) return null;
  return (
    <form action={switchUserAction} className="flex items-center gap-2 text-sm">
      <label className="flex items-center gap-2">
        <Avatar name={current?.name ?? null} />
        <span className="sr-only">Acting as</span>
        <select
          name="userId"
          // Remount on change: React reuses the DOM node across a soft
          // navigation, and an uncontrolled select keeps its old selection.
          key={current?.id}
          defaultValue={current?.id}
          className="rounded-md border border-transparent bg-transparent py-1 pl-1 pr-6 text-sm font-medium text-ink transition-colors hover:border-line hover:bg-surface focus:border-accent focus:outline-none"
        >
          {users.map((user) => (
            <option key={user.id} value={user.id}>
              {user.name}
            </option>
          ))}
        </select>
      </label>
      <button type="submit" className={`${buttonQuiet} px-2.5 py-1 text-xs`}>
        Switch
      </button>
    </form>
  );
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${sans.variable} ${mono.variable}`}>
      <body className="antialiased font-sans">
        <header className="sticky top-0 z-10 border-b border-line bg-surface/90 backdrop-blur">
          <div className="mx-auto flex h-14 max-w-6xl items-center justify-between px-6">
            <Link href="/" className="flex items-center gap-2 font-semibold tracking-tight">
              <span aria-hidden className="grid size-6 place-items-center rounded-md bg-ink text-[11px] font-semibold text-white">
                P
              </span>
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
