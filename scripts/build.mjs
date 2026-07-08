import { spawnSync } from "node:child_process";

function run(command) {
  const result = spawnSync(command, {
    shell: true,
    stdio: "inherit",
  });
  process.exit(result.status ?? 1);
}

/**
 * Cloudflare Workers Builds run from /opt/buildhome and deploy with wrangler.
 * A plain `next build` is not enough — OpenNext must bundle the worker first.
 */
const isCloudflareWorkersBuild =
  Boolean(process.env.CF_BUILD_URL) ||
  process.cwd().startsWith("/opt/buildhome") ||
  process.env.WORKERS_CI === "true";

if (isCloudflareWorkersBuild) {
  run("npm run build:cf");
} else {
  run("npm run build:next");
}
