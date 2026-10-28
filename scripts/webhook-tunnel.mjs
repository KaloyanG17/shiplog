// Forwards GitHub webhooks from a smee.io channel to the local dev server,
// so GitHub can reach localhost. Run with: npm run webhooks:dev
import "dotenv/config";
import SmeeClient from "smee-client";

const source = process.env.SMEE_URL;
if (!source) {
  const channel = await SmeeClient.createChannel();
  console.error(`SMEE_URL is not set in .env. Here's a fresh channel you can use:\n  ${channel}`);
  console.error("Put it in .env as SMEE_URL and in the GitHub App's Webhook URL, then run this again.");
  process.exit(1);
}

const target = `http://localhost:${process.env.PORT ?? 3000}/api/github/webhook`;
new SmeeClient({ source, target }).start();
