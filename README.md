# Account CRM: Eastern Counties Police Alliance and Aldermoor

A live CRM for the two Account Quest accounts. For each account it answers five questions, and every number on the page cites the id it came from (a fact, a file, a paperwork record, a live event or a request). Click any id to read the source.

1. **What is the book worth?** Agreed deals and won offers, each with its source. Anything that rests on an open blocker or a claim is shown apart.
2. **Who holds the power?** For each deal: who decides, who pays, who uses it and who could block it, with where each stands with us.
3. **What do you do first?** Moves ranked by due date and weight, each with an owner, a date and the deal it moves.
4. **What is about to go wrong?** Contract end dates, deadlines, live events, stuck deals, people going cold, unanswered requests and unverified claims.
5. **What do you still not know?** The gaps the plan rests on, why each matters and who could fill it.

## How it stays live

- `api/live.js` calls the MCP on the server (`get_signals`, `get_my_accounts`, `list_notes`, `whoami`). The token is read from the `AQ_TOKEN` environment variable and never reaches the browser.
- Responses are cached at Vercel's CDN (`s-maxage`), so the MCP sees at most about one call per tool per window, within the limit of one call a minute per token.
- The page loads a stored copy first (`public/data/snapshot.json`), then overlays live data, and refreshes live events every two minutes without a reload.
- New live events and open requests with no owner become moves and risks automatically, with no code change.
- "Save as next step" writes a move back through `write_note` (`api/note.js`).
- On load the page checks that every cited id exists in the data and says so at the top. Missing ids are struck through in red.

## How it decides

- `public/rules.js` holds the judgement: the power map per deal, the known moves and the gaps. Every entry cites the ids it rests on.
- `public/app.js` computes everything else from the data: totals, risks (contract end dates from `profile.json`, deadlines, signals, relationships, requests), generated moves and the ranking.
- A deal counts as backed only when it is agreed or an offer is won. Values are in the account's own currency (`profile.json`).

## Run it

```bash
cp .env.example .env            # then put your token in .env as AQ_TOKEN=...
node scripts/pull.js            # fetch everything once into data/ (one call a minute)
node scripts/pull.js files      # fetch every file listed in get_my_accounts
node scripts/snapshot.js        # bundle data/ into public/data/snapshot.json
node scripts/dev.js             # http://localhost:3000
```

Deploy on Vercel with `AQ_TOKEN` set as an environment variable. No build step is needed.

## Layout

```
api/live.js        read-only MCP proxy with CDN caching
api/note.js        write_note
lib/mcp.js         MCP JSON-RPC client (server only)
public/index.html  the page
public/app.js      the engine: five answers, source index, live overlay
public/rules.js    cited judgement: power map, moves, gaps
scripts/           pull, snapshot, local dev server
```
