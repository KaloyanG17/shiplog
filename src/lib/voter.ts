import { createHmac, randomUUID } from "node:crypto";
import { cookies } from "next/headers";

// Anonymous voters for public roadmaps. A random ID lives in an httpOnly
// cookie; only an HMAC of it (keyed with AUTH_SECRET) is stored, so votes
// can't be linked back to anyone and the raw ID never reaches the database.
const COOKIE = "shiplog_voter";

function hash(value: string) {
  const secret = process.env.AUTH_SECRET;
  if (!secret) throw new Error("AUTH_SECRET must be set");
  return createHmac("sha256", secret).update(value).digest("hex");
}

// For reading: the current visitor's hash, or null if they've never voted.
export async function currentVoterHash() {
  const value = (await cookies()).get(COOKIE)?.value;
  return value ? hash(value) : null;
}

// For voting (server actions only): creates the cookie on first vote.
export async function ensureVoterHash() {
  const store = await cookies();
  let value = store.get(COOKIE)?.value;
  if (!value) {
    value = randomUUID();
    store.set(COOKIE, value, {
      httpOnly: true,
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production",
      maxAge: 60 * 60 * 24 * 365,
      path: "/",
    });
  }
  return hash(value);
}
