// Server-side only. The token is read from the AQ_TOKEN environment variable.
const MCP = "https://questathon.aihackerscollective.com/api/public/mcp";

async function callTool(name, args = {}) {
  const token = process.env.AQ_TOKEN;
  if (!token) throw new Error("AQ_TOKEN is not set");
  const res = await fetch(MCP, {
    method: "POST",
    headers: {
      "content-type": "application/json",
      accept: "application/json, text/event-stream",
      authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({ jsonrpc: "2.0", id: Date.now(), method: "tools/call", params: { name, arguments: args } }),
  });
  const raw = await res.text();
  let body;
  try {
    body = JSON.parse(raw);
  } catch {
    // Some servers answer as an SSE stream: take the last data line.
    const line = raw.split("\n").filter((l) => l.startsWith("data:")).pop();
    body = JSON.parse(line.slice(5));
  }
  const { result, error } = body;
  if (error || result?.isError) throw new Error(error?.message ?? result.content[0].text);
  const text = result.content[0].text;
  try {
    return JSON.parse(text);
  } catch {
    return text;
  }
}

module.exports = { callTool };
