// Local preview without the Vercel CLI: serves public/ and the two API routes.
// Usage: node scripts/dev.js  ->  http://localhost:3000
const http = require("http");
const fs = require("fs");
const path = require("path");

const envPath = path.join(__dirname, "..", ".env");
if (fs.existsSync(envPath)) {
  for (const line of fs.readFileSync(envPath, "utf8").split(/\r?\n/)) {
    const m = line.match(/^\s*([A-Z_]+)\s*=\s*(.*)\s*$/);
    if (m && !process.env[m[1]]) process.env[m[1]] = m[2].trim();
  }
}
const routes = { "/api/live": require("../api/live"), "/api/note": require("../api/note") };
const types = { ".html": "text/html", ".js": "text/javascript", ".json": "application/json", ".css": "text/css" };
const cache = {};

http.createServer(async (req, res) => {
  const url = new URL(req.url, "http://x");
  const handler = routes[url.pathname];
  if (handler) {
    // Local stand-in for the CDN cache, so the dev server also keeps to one call a minute.
    const key = url.pathname + url.search;
    if (req.method === "GET" && cache[key] && Date.now() - cache[key].at < 90000) {
      res.writeHead(200, { "content-type": "application/json" });
      return res.end(cache[key].body);
    }
    let body = "";
    req.on("data", (c) => (body += c));
    await new Promise((r) => req.on("end", r));
    const shim = {
      status(c) { this.code = c; return this; },
      setHeader(k, v) { res.setHeader(k, v); },
      json(o) {
        const s = JSON.stringify(o);
        if (req.method === "GET" && !o.error) cache[key] = { at: Date.now(), body: s };
        res.writeHead(this.code || 200, { "content-type": "application/json" });
        res.end(s);
      },
    };
    return handler({ method: req.method, query: Object.fromEntries(url.searchParams), body }, shim);
  }
  let p = path.join(__dirname, "..", "public", url.pathname === "/" ? "index.html" : url.pathname);
  if (!fs.existsSync(p)) { res.writeHead(404); return res.end("not found"); }
  res.writeHead(200, { "content-type": types[path.extname(p)] || "application/octet-stream" });
  fs.createReadStream(p).pipe(res);
}).listen(3000, () => console.log("http://localhost:3000"));
