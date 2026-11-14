/* Account CRM: reads a stored copy, overlays live MCP data, answers five questions per account.
   Every number on the page carries the id it came from; click an id to see the source. */
(() => {
  const $ = (s, r = document) => r.querySelector(s);
  const esc = (s) => String(s ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
  const DAY = 86400000;

  const state = { snap: null, live: {}, liveErr: {}, notes: null, account: "A", index: new Map() };

  // ---------- data access ----------
  const accounts = () => state.live.accounts?.accounts || state.snap.accounts.accounts;
  const signals = () => (state.live.signals?.signals || state.snap.signals?.signals || []);
  const notesList = () => state.live.notes || state.snap.notes;
  const paper = (acc) => state.snap.paperwork?.[acc]?.records || [];
  const recBody = (r) => {
    if (!r) return "";
    if (r.text) return r.text;
    const rest = r.data ?? Object.fromEntries(Object.entries(r).filter(([k]) => !["path", "kind", "note"].includes(k)));
    return JSON.stringify(rest, null, 2);
  };
  const recJson = (acc, path) => {
    const r = paper(acc).find((x) => x.path === path);
    if (!r) return null;
    if (r.data) return r.data;
    try { return JSON.parse(recBody(r)); } catch { return null; }
  };
  const profile = (acc) => recJson(acc, "profile.json") || {};
  const currency = (acc) => profile(acc).currency || "";
  const sym = (c) => ({ GBP: "£", EUR: "€", USD: "$" }[c] || "");
  const money = (n, acc) => (n == null ? "unknown" : sym(currency(acc)) + Number(n).toLocaleString("en-GB"));

  function parseCsv(text) {
    const rows = [];
    let row = [], cell = "", q = false;
    for (let i = 0; i < text.length; i++) {
      const c = text[i];
      if (q) {
        if (c === '"' && text[i + 1] === '"') { cell += '"'; i++; }
        else if (c === '"') q = false;
        else cell += c;
      } else if (c === '"') q = true;
      else if (c === ",") { row.push(cell); cell = ""; }
      else if (c === "\n" || c === "\r") {
        if (c === "\r" && text[i + 1] === "\n") i++;
        row.push(cell); cell = "";
        if (row.some((x) => x !== "")) rows.push(row);
        row = [];
      } else cell += c;
    }
    if (cell || row.length) { row.push(cell); rows.push(row); }
    const [head, ...body] = rows;
    return body.map((r) => Object.fromEntries(head.map((h, i) => [h.trim(), (r[i] ?? "").trim()])));
  }

  // Requests: the account's requests.csv plus rows that live signals add.
  function requests(acc) {
    const base = paper(acc).find((r) => r.path === "requests.csv");
    const rows = base ? parseCsv(base.text) : [];
    for (const s of signals().filter((s) => s.account === acc)) {
      for (const r of s.records || []) {
        if (r.path?.endsWith("requests.csv") && r.text) {
          for (const row of parseCsv(r.text)) rows.push({ ...row, _signal: s.id });
        }
      }
    }
    return rows.map((r) => ({ ...r, key: r.request_id && r.request_id !== "(none)" ? r.request_id : `requests.csv@${r.opened}` }));
  }

  // ---------- source index: every citable id ----------
  function buildIndex() {
    const ix = new Map();
    const add = (id, entry) => { if (id && !ix.has(id)) ix.set(id, entry); };
    for (const a of accounts()) {
      for (const f of a.facts) add(f.id, { kind: "fact", title: `${f.said_by} (${f.status})`, body: f.text + (f.verified_by ? `\n\nVerified by: ${f.verified_by}` : ""), acc: a.id, status: f.status });
      for (const o of a.opportunities) add(o.id, { kind: "deal", title: o.title, body: `Stage: ${o.stage}\nWorth up to: ${o.worth_up_to ?? "not known"}\nBlocker: ${o.blocker?.text ?? "none known"} (${o.blocker?.status ?? "-"})\nEvidence: ${o.evidence.join(", ")}`, acc: a.id });
      for (const o of a.offers) add(o.id, { kind: "offer", title: o.title, body: `Value: ${o.value}\nPitched to: ${o.pitch_to}\nStatus: ${o.status}`, acc: a.id });
      for (const p of a.stakeholders) add(p.id, { kind: "person", title: p.name, body: `${p.role}\nRelationship: ${p.relationship}\nAvailable: ${p.available}`, acc: a.id });
      for (const r of paper(a.id)) add(r.path, { kind: r.kind, title: `${a.id}/${r.path}`, body: recBody(r), acc: a.id });
      for (const q of requests(a.id)) add(q.key, { kind: "request", title: `${q.request_id} from ${q.from}`, body: Object.entries(q).filter(([k]) => !k.startsWith("_") && k !== "key").map(([k, v]) => `${k}: ${v}`).join("\n"), acc: a.id });
    }
    const files = state.snap.accounts.files || [];
    for (const f of files) {
      const content = state.snap.files?.[f.id];
      add(f.id, { kind: "file", title: f.title, body: content ? (typeof content === "string" ? content : content.content ?? content.text ?? JSON.stringify(content, null, 2)) : `File ${f.path} (contents not stored yet)`, acc: f.account });
    }
    for (const s of signals()) add(s.id, { kind: "live event", title: s.title, body: `${s.dated}\n${s.summary}\n\n` + (s.records || []).map((r) => `--- ${r.path}\n${r.text}`).join("\n"), acc: s.account });
    for (const t of state.snap.team?.team || state.snap.team?.people || []) add(t.id, { kind: "FlytBase", title: t.name, body: `${t.role || ""}\n${t.knows || t.about || ""}`, acc: null });
    state.index = ix;
  }

  const chip = (id) => {
    const ok = state.index.has(id);
    return `<button class="src${ok ? "" : " missing"}" data-src="${esc(id)}" title="${ok ? "Open source" : "Not found in the data"}">${esc(id)}</button>`;
  };
  const chips = (ids) => `<span class="srcs">${(ids || []).map(chip).join("")}</span>`;
  const personName = (acc, id) => accounts().find((a) => a.id === acc)?.stakeholders.find((p) => p.id === id)?.name
    || (state.snap.team?.team || state.snap.team?.people || []).find((t) => t.id === id)?.name || id;
  const rel = (acc, id) => accounts().find((a) => a.id === acc)?.stakeholders.find((p) => p.id === id);

  // "Today" is the later of the real date and the newest dated live event.
  function today() {
    const latest = signals().map((s) => Date.parse(s.dated)).filter(Boolean);
    return new Date(Math.max(Date.now(), ...latest));
  }
  const fmt = (d) => new Date(d).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" });
  const daysTo = (d) => Math.round((Date.parse(d) - today().getTime()) / DAY);

  // ---------- Q1 book ----------
  function book(acc) {
    const a = accounts().find((x) => x.id === acc);
    const prof = profile(acc);
    const backed = [], unbacked = [];
    for (const o of a.opportunities) {
      const verified = o.evidence.filter((e) => state.index.get(e)?.status === "verified" || state.index.get(e)?.kind === "file");
      const row = { id: o.id, title: o.title, value: o.worth_up_to, stage: o.stage, cite: [o.id, ...o.evidence] };
      if (o.stage === "agreed") backed.push({ ...row, basis: "Agreed in a meeting; blocker cleared.", cite: [o.id, ...verified] });
      else unbacked.push({ ...row, basis: o.blocker ? `Blocker ${o.blocker.status}: ${o.blocker.text}` : "No blocker identified yet; value not known.", claims: o.evidence.filter((e) => state.index.get(e)?.status === "claim") });
    }
    for (const o of a.offers) {
      if (o.status === "won") backed.push({ id: o.id, title: o.title, value: o.value, stage: "offer won", basis: `Accepted by ${o.pitch_to}.`, cite: [o.id] });
      else unbacked.push({ id: o.id, title: o.title, value: o.value, stage: `offer ${o.status}`, basis: `Not yet accepted by ${o.pitch_to}.`, cite: [o.id] });
    }
    const contract = prof.renewal ? { value: prof.renewal.annual_value, ends: prof.renewal.term_ends, cite: ["contract.txt", "profile.json"] } : null;
    const sum = (xs) => xs.reduce((t, x) => t + (x.value || 0), 0);
    return { backed, unbacked, contract, backedTotal: sum(backed), unbackedTotal: sum(unbacked.filter((x) => x.value)) };
  }

  // ---------- Q3 moves ----------
  function moves(acc) {
    const t0 = today();
    // Due = today + in_days, never later than the hard limit "by" (a deadline on file).
    const iso = (d) => new Date(d).toISOString().slice(0, 10);
    const known = (window.RULES.moves || []).filter((m) => m.account === acc).map((m) => ({
      ...m, source: "rule",
      due: m.due || iso(Math.min(t0.getTime() + (m.in_days || 3) * DAY, m.by ? Date.parse(m.by) : Infinity)),
    }));
    const covered = new Set(known.flatMap((m) => m.covers || []));
    const extra = [];
    for (const s of signals().filter((s) => s.account === acc && !covered.has(s.id))) {
      const due = new Date(Math.max(Date.parse(s.dated), t0.getTime()) + 2 * DAY).toISOString().slice(0, 10);
      extra.push({ id: "auto_" + s.id, account: acc, deal: null, text: `Respond to: ${s.title}`, owner: "You", due, weight: 8, why: s.summary, cite: [s.id], source: "live event" });
    }
    for (const r of requests(acc).filter((r) => /open/i.test(r.status) && !r.owner && !covered.has(r.key) && !covered.has(r._signal))) {
      const due = new Date(t0.getTime() + 5 * DAY).toISOString().slice(0, 10);
      extra.push({ id: "auto_" + r.key, account: acc, deal: null, text: `Answer and own: ${r.summary}`, owner: "You", due, weight: 5, why: `Open since ${r.opened} from ${r.from}, no owner.`, cite: [r.key], source: "open request" });
    }
    const all = [...known, ...extra];
    // Rank: overdue/soonest first, then weight.
    all.forEach((m) => { m.days = daysTo(m.due); m.score = m.weight * 10 - Math.max(m.days, -10); });
    return all.sort((a, b) => b.score - a.score);
  }

  // ---------- Q4 risks ----------
  function risks(acc) {
    const a = accounts().find((x) => x.id === acc);
    const out = [];
    const prof = profile(acc);
    if (prof.renewal) {
      const d = daysTo(prof.renewal.term_ends);
      out.push({ sev: d < 90 ? "high" : "med", title: `Contract ends ${fmt(prof.renewal.term_ends)} with no automatic renewal`, when: `${d} days left; a new order must be signed before then.`, cite: ["contract.txt", "profile.json"] });
    }
    for (const o of a.opportunities) {
      if (o.deadline && !o.deadline.met) out.push({ sev: o.deadline.passed ? "high" : "high", title: o.deadline.text, when: o.deadline.passed ? "Deadline passed." : (o.deadline.moves_left != null ? `${o.deadline.moves_left} moves left.` : "Coming soon; no date on file."), cite: [o.id] });
      if (o.blocker?.status === "open") out.push({ sev: "med", title: `Stuck: ${o.title}`, when: `Blocker open: ${o.blocker.text}`, cite: [o.id] });
    }
    for (const s of signals().filter((s) => s.account === acc)) out.push({ sev: "high", title: s.title, when: `Since ${fmt(s.dated)}. ${s.summary}`, cite: [s.id] });
    for (const p of a.stakeholders) {
      if (["guarded", "neutral"].includes(p.relationship)) out.push({ sev: "low", title: `${p.name} is ${p.relationship} with us`, when: "Goes cold if nobody follows up.", cite: [p.id] });
      if (p.available === false) out.push({ sev: "high", title: `${p.name} is no longer available`, when: "Their deals need a new contact.", cite: [p.id] });
    }
    for (const r of requests(acc).filter((r) => /open|pending/i.test(r.status))) {
      const age = Math.round((today() - Date.parse(r.opened)) / DAY);
      out.push({ sev: age > 30 ? "med" : "low", title: `Request unanswered ${age} days: ${r.summary}`, when: r.owner ? `Owner: ${r.owner}` : "No owner.", cite: [r.key] });
    }
    for (const f of a.facts.filter((f) => f.status === "claim")) out.push({ sev: "low", title: `Unverified claim: "${f.text}"`, when: `Said by ${f.said_by}; nothing on file backs it.`, cite: [f.id] });
    const rank = { high: 0, med: 1, low: 2 };
    return out.sort((x, y) => rank[x.sev] - rank[y.sev]);
  }

  // ---------- Q5 gaps ----------
  function gaps(acc) {
    const fromRules = (window.RULES.gaps || []).filter((g) => g.account === acc);
    const prof = profile(acc);
    const fromFile = (prof.not_on_file || []).filter((t) => !fromRules.some((g) => g.text.toLowerCase().slice(0, 25) === t.toLowerCase().slice(0, 25)))
      .map((t) => ({ text: t, matters: "Listed as missing from the account record.", ask: "Account contacts", cite: ["profile.json"] }));
    return [...fromRules, ...fromFile];
  }

  // ---------- render ----------
  function render() {
    buildIndex();
    const acc = state.account;
    const a = accounts().find((x) => x.id === acc);
    document.querySelectorAll(".tab").forEach((t) => t.classList.toggle("on", t.dataset.acc === acc));
    const b = book(acc);
    const mv = moves(acc);
    const rk = risks(acc);
    const gp = gaps(acc);
    const missing = [...document.querySelectorAll(".src.missing")].length;

    $("#acct").innerHTML = `
      <section class="hero">
        <div>
          <h2>${esc(a.name)}</h2>
          <p class="muted">Official story: “${esc(a.official_story)}” ${chip(acc === "A" ? "profile.json" : "profile.json")}</p>
        </div>
        <div class="kpis">
          <div class="kpi"><span>Backed</span><b>${money(b.backedTotal, acc)}</b><small>agreed deals and won offers</small></div>
          <div class="kpi"><span>Not backed</span><b>${money(b.unbackedTotal, acc)}</b><small>open, worth up to</small></div>
          <div class="kpi"><span>Contract at stake</span><b>${b.contract ? money(b.contract.value, acc) : "-"}</b><small>${b.contract ? "ends " + fmt(b.contract.ends) : ""}</small></div>
        </div>
      </section>

      <section class="card"><h3><i>1</i> What is the book worth?</h3>
        <table><thead><tr><th>Backed</th><th>Stage</th><th class="r">Value</th><th>Why we can back it</th><th>Source</th></tr></thead><tbody>
        ${b.backed.map((x) => `<tr><td>${esc(x.title)}</td><td>${esc(x.stage)}</td><td class="r">${money(x.value, acc)}</td><td>${esc(x.basis)}</td><td>${chips(x.cite)}</td></tr>`).join("")}
        <tr class="tot"><td>Total backed</td><td></td><td class="r">${money(b.backedTotal, acc)}</td><td colspan="2">Sum of the rows above.</td></tr>
        </tbody></table>
        <table class="apart"><thead><tr><th>Shown apart: cannot back yet</th><th>Stage</th><th class="r">Worth up to</th><th>Why not</th><th>Source</th></tr></thead><tbody>
        ${b.unbacked.map((x) => `<tr><td>${esc(x.title)}</td><td>${esc(x.stage)}</td><td class="r">${money(x.value, acc)}</td><td>${esc(x.basis)}${x.claims?.length ? `<br><small class="warn">Rests partly on unverified claims: ${chips(x.claims)}</small>` : ""}</td><td>${chips([x.id])}</td></tr>`).join("")}
        </tbody></table>
        ${b.contract ? `<p class="note">The current contract is ${money(b.contract.value, acc)} a year and ends ${fmt(b.contract.ends)}. Its renewal is the “Renew” row above. ${chips(b.contract.cite)}</p>` : ""}
        <p class="note">Values are in ${esc(currency(acc) || "the account's currency")} ${chip("profile.json")}. The game's deal list shows the same figures with a $ sign.</p>
      </section>

      <section class="card"><h3><i>2</i> Who holds the power?</h3>
        <div class="grid">
        ${a.opportunities.map((o) => {
          const roles = window.RULES.power[o.id] || [];
          return `<div class="deal"><h4>${esc(o.title)} ${chip(o.id)}</h4>
            ${roles.length ? `<ul>${roles.map((r) => {
              const p = rel(acc, r.who);
              const name = p ? p.name : personName(acc, r.who);
              const team = (state.snap.team?.people || []).find((t) => t.id === r.who);
              const st = p ? `<span class="rel ${p.relationship}">${esc(p.relationship)}</span>` : team ? `<span class="rel">FlytBase</span>` : `<span class="rel unknown">not met</span>`;
              return `<li><span class="role ${r.role}">${r.role.replace("_", " ")}</span> <b>${esc(name)}</b> ${st}<br><small>${esc(r.why)}</small> ${chips(r.cite)}</li>`;
            }).join("")}</ul>` : `<p class="muted">No roles mapped yet for this deal.</p>`}
          </div>`;
        }).join("")}
        </div>
      </section>

      <section class="card"><h3><i>3</i> What do you do first?</h3>
        <ol class="moves">
        ${mv.map((m, i) => `<li class="${i < 3 ? "top" : ""}">
          <div class="mhead"><b>${i + 1}. ${esc(m.text)}</b></div>
          <div class="mmeta"><span>Owner: ${esc(m.owner)}</span><span class="${m.days < 0 ? "late" : m.days <= 7 ? "soon" : ""}">By ${fmt(m.due)} (${m.days < 0 ? Math.abs(m.days) + " days late" : m.days + " days"})</span>${m.deal ? `<span>Moves ${chip(m.deal)}</span>` : ""}<span class="tag">${esc(m.source)}</span></div>
          <div class="mwhy">${esc(m.why)} ${chips(m.cite)}</div>
          <button class="save" data-move="${esc(m.id)}">Save as next step</button>
        </li>`).join("")}
        </ol>
        <p class="note">Ranked by how soon each is due and how much rides on it. Live events and open requests with no owner become moves automatically.</p>
      </section>

      <section class="card"><h3><i>4</i> What is about to go wrong?</h3>
        <ul class="risks">${rk.map((r) => `<li class="${r.sev}"><span class="sev">${r.sev}</span><div><b>${esc(r.title)}</b><br><small>${esc(r.when)}</small> ${chips(r.cite)}</div></li>`).join("")}</ul>
      </section>

      <section class="card"><h3><i>5</i> What do you still not know?</h3>
        <table><thead><tr><th>Gap</th><th>Why it matters</th><th>Who could fill it</th><th>Source</th></tr></thead><tbody>
        ${gp.map((g) => `<tr><td>${esc(g.text)}</td><td>${esc(g.matters)}</td><td>${esc(personName(acc, g.ask))}</td><td>${chips(g.cite)}</td></tr>`).join("")}
        </tbody></table>
      </section>`;

    renderNotes();
    const miss = [...document.querySelectorAll(".src.missing")].map((x) => x.dataset.src);
    $("#integrity").textContent = miss.length ? `${miss.length} cited id(s) not found in the current data: ${[...new Set(miss)].join(", ")}` : "Every cited id was found in the data.";
    $("#integrity").className = miss.length ? "bad" : "good";
    window.__moves = mv;
  }

  function renderNotes() {
    const n = notesList();
    const list = Array.isArray(n) ? n : n?.notes || [];
    $("#notes").innerHTML = list.length
      ? list.slice().reverse().slice(0, 12).map((x) => `<li><b>${esc(x.kind || "note")}</b> ${x.account ? `[${esc(x.account)}]` : ""} ${esc(x.title || "")} <small>${esc(x.text || "")}</small></li>`).join("")
      : `<li class="muted">No notes written back yet.</li>`;
  }

  function renderStatus() {
    const parts = [`Stored copy: ${fmt(state.snap.stored_at)} ${new Date(state.snap.stored_at).toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" })}`];
    for (const k of ["signals", "accounts", "notes"]) {
      if (state.live[k + "_at"]) parts.push(`${k}: live ${new Date(state.live[k + "_at"]).toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" })}`);
      else if (state.liveErr[k]) parts.push(`${k}: stored (live busy)`);
    }
    $("#status").textContent = parts.join(" · ");
    $("#asof").textContent = `As of ${fmt(today())}. ${signals().length} live event(s).`;
  }

  // ---------- source drawer ----------
  document.addEventListener("click", async (e) => {
    const s = e.target.closest(".src");
    if (s) {
      const id = s.dataset.src;
      const x = state.index.get(id);
      $("#drawer h3").textContent = id;
      $("#drawer .kind").textContent = x ? `${x.kind}${x.acc ? " · account " + x.acc : ""} · ${x.title}` : "Not found in the data";
      $("#drawer pre").textContent = x ? x.body : "This id is not in the current data.";
      $("#drawer").classList.add("open");
      return;
    }
    if (e.target.closest("#drawer .x")) $("#drawer").classList.remove("open");
    const t = e.target.closest(".tab");
    if (t) { state.account = t.dataset.acc; try { localStorage.setItem("acc", state.account); } catch {} render(); }
    const sv = e.target.closest(".save");
    if (sv) {
      const m = (window.__moves || []).find((x) => x.id === sv.dataset.move);
      sv.disabled = true; sv.textContent = "Saving…";
      const r = await fetch("/api/note", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ account: m.account, kind: "next_step", title: m.text.slice(0, 110), text: `${m.text} Owner: ${m.owner}. By ${m.due}. Why: ${m.why} Sources: ${m.cite.join(", ")}` }) }).then((x) => x.json()).catch((err) => ({ ok: false, error: String(err) }));
      sv.textContent = r.ok ? "Saved to MCP" : "Busy, try in a minute";
      if (!r.ok) setTimeout(() => { sv.disabled = false; sv.textContent = "Save as next step"; }, 4000);
      else setTimeout(() => pull("notes"), 65000);
    }
  });

  // ---------- live ----------
  async function pull(tool) {
    try {
      const r = await fetch(`/api/live?tool=${tool}`).then((x) => x.json());
      if (r.error) { state.liveErr[tool] = r.error; }
      else {
        state.live[tool] = r.data; state.live[tool + "_at"] = r.fetched_at; delete state.liveErr[tool];
      }
    } catch (e) { state.liveErr[tool] = String(e); }
    renderStatus(); render();
  }

  async function boot() {
    state.snap = await fetch("/data/snapshot.json").then((r) => r.json());
    try { state.account = localStorage.getItem("acc") || "A"; } catch {}
    render(); renderStatus();
    // Stagger first calls; the CDN keeps each to one MCP call per window.
    pull("signals");
    setTimeout(() => pull("accounts"), 2500);
    setTimeout(() => pull("notes"), 5000);
    setInterval(() => pull("signals"), 120000);
    setInterval(() => pull("accounts"), 600000);
  }
  boot();
})();
