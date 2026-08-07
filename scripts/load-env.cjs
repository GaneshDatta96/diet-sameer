const fs = require("fs");
const path = require("path");

const root = path.join(__dirname, "..");
for (const file of [".env.local", ".env"]) {
  try {
    const raw = fs.readFileSync(path.join(root, file), "utf8");
    for (const line of raw.split(/\r?\n/)) {
      const m = line.match(/^([^#=\s]+)\s*=\s*(.*)$/);
      if (!m) continue;
      let val = m[2].trim();
      if (
        (val.startsWith('"') && val.endsWith('"')) ||
        (val.startsWith("'") && val.endsWith("'"))
      ) {
        val = val.slice(1, -1);
      }
      if (process.env[m[1]] === undefined) process.env[m[1]] = val;
    }
  } catch {
    // optional
  }
}
if (!process.env.SMTP_PORT) process.env.SMTP_PORT = "465";
