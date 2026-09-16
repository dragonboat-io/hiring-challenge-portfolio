import "server-only";

import { cookies } from "next/headers";
import { listUsers } from "@/lib/db/projects";

export const USER_COOKIE = "demo_user_id";

/**
 * There is no auth in this challenge. "Who am I" is a cookie set by the header
 * switcher, falling back to the first seeded user — enough to attribute
 * comments and to give the assistant a meaning for "my projects".
 */
export async function getCurrentUser() {
  const all = await listUsers();
  if (all.length === 0) return null;
  const raw = (await cookies()).get(USER_COOKIE)?.value;
  const id = raw ? Number(raw) : NaN;
  return all.find((user) => user.id === id) ?? all[0];
}
