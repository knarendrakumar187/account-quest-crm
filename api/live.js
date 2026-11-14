// GET /api/live?tool=signals|accounts|notes|whoami
// Proxies one read-only MCP tool. The token never leaves the server.
// Responses are cached at Vercel's CDN, so however many people open the CRM,
// the MCP sees at most one call per tool per cache window (limit: 1 call/min/token).
const { callTool } = require("../lib/mcp");

const TOOLS = {
  signals: { name: "get_signals", ttl: 90 },
  whoami: { name: "whoami", ttl: 240 },
  accounts: { name: "get_my_accounts", ttl: 600 },
  notes: { name: "list_notes", ttl: 300 },
};

module.exports = async (req, res) => {
  const key = (req.query && req.query.tool) || "signals";
  const tool = TOOLS[key];
  if (!tool) {
    res.status(400).json({ error: `unknown tool ${key}` });
    return;
  }
  try {
    const data = await callTool(tool.name);
    res.setHeader("Cache-Control", `public, s-maxage=${tool.ttl}, stale-while-revalidate=86400`);
    res.status(200).json({ tool: tool.name, fetched_at: new Date().toISOString(), data });
  } catch (e) {
    // Rate limited or down: tell the page, and let it keep the stored copy.
    res.setHeader("Cache-Control", "public, s-maxage=30");
    res.status(200).json({ tool: tool.name, error: String(e.message || e).slice(0, 300) });
  }
};
