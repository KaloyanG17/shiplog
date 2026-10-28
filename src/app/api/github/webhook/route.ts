import type { EmitterWebhookEvent } from "@octokit/webhooks";
import { getWebhooks } from "@/lib/webhooks";

// GitHub App webhook endpoint. Every request is signed with the app's webhook
// secret (X-Hub-Signature-256); unsigned or tampered requests are rejected.
export async function POST(request: Request) {
  const id = request.headers.get("x-github-delivery");
  const name = request.headers.get("x-github-event");
  const signature = request.headers.get("x-hub-signature-256");
  if (!id || !name || !signature) {
    return Response.json({ error: "Missing GitHub webhook headers" }, { status: 400 });
  }

  // Verify against the raw body: re-serialized JSON wouldn't match the signature.
  const body = await request.text();
  const webhooks = getWebhooks();
  if (!(await webhooks.verify(body, signature))) {
    return Response.json({ error: "Invalid signature" }, { status: 401 });
  }

  try {
    await webhooks.receive({ id, name, payload: JSON.parse(body) } as EmitterWebhookEvent);
  } catch (error) {
    // A 500 shows up as a failed delivery in the GitHub App settings, where it
    // can be redelivered.
    console.error(`Webhook ${name} (${id}) failed:`, error);
    return Response.json({ error: "Handler failed" }, { status: 500 });
  }

  return Response.json({ ok: true });
}
