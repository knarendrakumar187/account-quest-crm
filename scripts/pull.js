// Pulls a snapshot of your game data into data/*.json, one call a minute (the token's limit).
// Usage: node scripts/pull.js [tool ...]   e.g. node scripts/pull.js get_my_accounts get_signals
const fs = require("fs");
const path = require("path");

// Minimal .env loader, so no dependency is needed.
const envPath = path.join(__dirname, "..", ".env");
if (fs.existsSync(envPath)) {
  for (const line of fs.readFileSync(envPath, "utf8").split(/\r?\n/)) {
    const m = line.match(/^\s*([A-Z_]+)\s*=\s*(.*)\s*$/);
    if (m && !process.env[m[1]]) process.env[m[1]] = m[2];
  }
}
const { callTool } = require("../lib/mcp");

const DEFAULT = [
  ["whoami", {}],
  ["get_my_accounts", {}],
  ["get_signals", {}],
  ["get_all_paperwork", { account: "A" }],
  ["get_all_paperwork", { account: "B" }],
  ["get_flytbase_team", {}],
  ["get_feature_requests", {}],
  ["get_release_notes", {}],
  ["list_notes", {}],
];

const wanted = process.argv.slice(2);
// "files" expands to one get_file call per file listed in data/get_my_accounts.json.
const fileJobs = () => {
  const p = path.join(__dirname, "..", "data", "get_my_accounts.json");
  if (!fs.existsSync(p)) return [];
  return JSON.parse(fs.readFileSync(p, "utf8")).files.map((f) => ["get_file", { id: f.id }]);
};
const jobs = wanted.length
  ? wanted.flatMap((w) => {
      if (w === "files") return fileJobs();
      if (w.startsWith("file:")) return [["get_file", { id: w.slice(5) }]];
      return DEFAULT.filter(([n, a]) => w === n || w === `${n}:${a.account}`);
    })
  : DEFAULT;

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

(async () => {
  for (let i = 0; i < jobs.length; i++) {
    const [name, args] = jobs[i];
    const suffix = args.account ? "_" + args.account : args.id ? "_" + args.id : "";
    const file = path.join(__dirname, "..", "data", `${name}${suffix}.json`);
    try {
      const out = await callTool(name, args);
      fs.writeFileSync(file, JSON.stringify(out, null, 2));
      console.log(`ok   ${name} ${JSON.stringify(args)} -> ${path.basename(file)}`);
    } catch (e) {
      console.log(`FAIL ${name} ${JSON.stringify(args)}: ${e.message}`);
    }
    if (i < jobs.length - 1) await sleep(62_000);
  }
})();
