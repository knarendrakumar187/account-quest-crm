// POST /api/note  { text, account?, kind?, title? }  -> write_note on the MCP.
// Writes back a note, task, risk or next_step. Cannot change the game itself.
const { callTool } = require("../lib/mcp");

const KINDS = new Set(["note", "task", "risk", "next_step"]);

module.exports = async (req, res) => {
  res.setHeader("Cache-Control", "no-store");
  if (req.method !== "POST") {
    res.status(405).json({ error: "POST only" });
    return;
  }
  let body = req.body;
  if (typeof body === "string") {
    try { body = JSON.parse(body); } catch { body = {}; }
  }
  const text = String(body?.text || "").trim().slice(0, 2000);
  if (!text) {
    res.status(400).json({ error: "text is required" });
    return;
  }
  const args = { text };
  if (body.account === "A" || body.account === "B") args.account = body.account;
  if (KINDS.has(body.kind)) args.kind = body.kind;
  if (body.title) args.title = String(body.title).slice(0, 120);
  try {
    const out = await callTool("write_note", args);
    res.status(200).json({ ok: true, result: out });
  } catch (e) {
    res.status(200).json({ ok: false, error: String(e.message || e).slice(0, 300) });
  }
};
