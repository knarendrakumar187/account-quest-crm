# Account CRM: thinking doc

Live CRM: https://account-quest-crm.vercel.app
Code: https://github.com/knarendrakumar187/account-quest-crm

## What it does, and for whom

It is the page a new CSM hands their manager on Monday for two inherited accounts: Eastern Counties Police Alliance (£, 35 docks) and Aldermoor Industrial Group (€, 14 docks). For each account it answers five questions: what the book is worth, who holds the power, what to do first, what is about to go wrong, and what we still do not know. Every number and claim carries the id it came from. Clicking the id opens the source: the fact as the person said it, the file, the call note, the contract, the live event or the request row.

## How it decides: the rules

- **Book worth.** A deal counts as backed only if it is agreed (blocker cleared, decider and payer in the room) or an offer was accepted. Everything else is shown apart, with its blocker and any unverified claims it leans on. The contract value at stake comes from the contract and the account profile, not from what a champion said.
- **Power.** For each deal, who decides, who pays, who uses it and who could block it. Each role cites the facts that show it. People we have not met (force finance officers, the Norwold chief, the sister-company buyer) are shown as not met, not guessed.
- **First moves.** Known moves come from the rules file. Each has an owner, a deal it moves and a due date set as today plus a few days, never later than the hard deadline on file. Any live event or open request with no owner becomes a move on its own. Moves are ranked by due date and by how much rides on them.
- **Risks.** Computed from the data: contract end dates with no automatic renewal, deadlines, live events, open blockers, people who are neutral or guarded, requests left unanswered (with their age), and claims nothing backs.
- **Gaps.** What the plan rests on but we do not know, why it matters and who could tell us. The account profile's own "not on file" list is added automatically.
- **Honesty check.** On every load the page checks that each cited id exists in the data and reports any it cannot find.

## How it stays live

The token stays on the server (Vercel functions). The page loads a stored copy, then overlays live `get_signals`, `get_my_accounts` and `list_notes`. Responses are cached at the CDN so the MCP sees about one call per tool per window, within one call a minute. "Save as next step" writes back with `write_note`.

## What it does not do yet

- It does not parse the flight and usage CSVs into a per-force or per-plant usage chart. It cites them as sources instead.
- The power map and known moves are judgement held in `rules.js`. New people or deals that arrive live show up in risks and gaps but get no role until the rules are updated.
- No currency conversion: £ and € are kept apart.
- No login; anyone with the link can read it and save a next step.

## How I used AI

I used Claude (Claude Code) heavily, under my direction. It played most of the discovery game in my browser, wrote the MCP client, the server routes and the page, and drafted the cited rules (power map, moves, gaps) from the data. I set the goals, made the calls on publishing and hosting, and reviewed the result. The page's own integrity check confirms that every id it cites exists in the data, so no rule rests on an invented source.
