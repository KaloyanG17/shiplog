import { connection } from "next/server";
import NextAuth from "next-auth";
import GitHub from "next-auth/providers/github";
import { PrismaAdapter } from "@auth/prisma-adapter";
import { db } from "@/lib/db";

// GitHub credentials are read from AUTH_GITHUB_ID / AUTH_GITHUB_SECRET,
// and the session secret from AUTH_SECRET (see .env.example).
export const { handlers, auth, signIn, signOut } = NextAuth({
  adapter: PrismaAdapter(db),
  providers: [GitHub],
  pages: {
    signIn: "/login",
  },
});

// Use this instead of auth() in Server Components. auth() touches crypto and
// Date.now() before reading cookies, which Cache Components rejects during
// prerendering; connection() marks the component as request-time first.
export async function getSession() {
  await connection();
  return auth();
}
