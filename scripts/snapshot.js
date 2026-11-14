// Bundles everything pulled into data/ into one stored copy the page loads first:
// public/data/snapshot.json. The page then overlays live calls (/api/live) on top.
const fs = require("fs");
const path = require("path");

const dir = path.join(__dirname, "..", "data");
const read = (f) => {
  const p = path.join(dir, f);
  return fs.existsSync(p) ? JSON.parse(fs.readFileSync(p, "utf8")) : null;
};

const files = {};
for (const f of fs.readdirSync(dir)) {
  const m = f.match(/^get_file_(.+)\.json$/);
  if (m) files[m[1]] = read(f);
}

const snapshot = {
  stored_at: new Date().toISOString(),
  whoami: read("whoami.json"),
  accounts: read("get_my_accounts.json"),
  signals: read("get_signals.json"),
  paperwork: { A: read("get_all_paperwork_A.json"), B: read("get_all_paperwork_B.json") },
  team: read("get_flytbase_team.json"),
  feature_requests: read("get_feature_requests.json"),
  release_notes: read("get_release_notes.json"),
  notes: read("list_notes.json"),
  files,
};

const out = path.join(__dirname, "..", "public", "data");
fs.mkdirSync(out, { recursive: true });
fs.writeFileSync(path.join(out, "snapshot.json"), JSON.stringify(snapshot));
console.log("wrote public/data/snapshot.json", Object.keys(files).length, "files");
