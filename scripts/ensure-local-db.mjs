import { spawnSync } from "node:child_process";

const result = spawnSync(process.platform === "win32" ? "npx.cmd" : "npx", [
  "wrangler", "d1", "migrations", "apply", "triage-health-db", "--local", "--config", "wrangler.jsonc"
], { stdio: "inherit" });

if (result.error) throw result.error;
process.exit(result.status ?? 1);
