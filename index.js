// Simple non-TUI example — see src/app.js for the full TUI version
// Run with: npm start (or: node src/app.js)

import { Poke } from "poke";

const POKE_API_KEY = process.env.POKE_API_KEY;

if (!POKE_API_KEY) {
  console.error(
    "Missing POKE_API_KEY. Set it via:\n" +
      "  export POKE_API_KEY=pk_your_key_here\n\n" +
      "Get one at https://poke.com/kitchen/api-keys"
  );
  process.exit(1);
}

const poke = new Poke({ apiKey: POKE_API_KEY });

async function sendMessage() {
  console.log("── Sending a message to Poke ──\n");
  const res = await poke.sendMessage("Hey Poke! This is a test message sent from the API.");
  console.log("Response:", res);
  return res;
}

async function createAndFireWebhook() {
  console.log("\n── Creating a webhook trigger ──\n");
  const webhook = await poke.createWebhook({
    condition: "When a deploy status is received",
    action: "Summarize the deploy result and notify me",
  });
  console.log("Webhook created:");
  console.log("  triggerId:   ", webhook.triggerId);
  console.log("  webhookUrl:  ", webhook.webhookUrl);
  console.log("  webhookToken:", webhook.webhookToken.slice(0, 20) + "…");

  console.log("\n── Firing the webhook with sample data ──\n");
  const fireRes = await poke.sendWebhook({
    webhookUrl: webhook.webhookUrl,
    webhookToken: webhook.webhookToken,
    data: {
      event: "deploy_completed",
      repo: "poke-test",
      branch: "main",
      status: "success",
      duration: "42s",
      commit: "abc1234",
      author: "developer",
      timestamp: new Date().toISOString(),
    },
  });
  console.log("Webhook fired:", fireRes);
  return fireRes;
}

try {
  await sendMessage();
  await createAndFireWebhook();
  console.log("\n✓ All done!");
} catch (err) {
  console.error("\n✗ Error:", err.message);
  process.exit(1);
}
