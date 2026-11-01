# Social Operations for Claude Code

Plan the content week, record exactly what a person approved and review post results in a database you own.

| Do it yourself | We customise it | We run it for you |
|---|---|---|
| Free, MIT. Install the demo and use your own records. | Your fields, approval rules, Sprout exports and review documents. | Installed, connected and operated through Omni by Enterprise DNA. Setup fee, then a retainer. |

[Get your version built](https://enterprisedna.co/omni/book/?offer=replace-software&utm_source=github&utm_medium=readme&utm_campaign=sprout-social) · [Instead of Sprout Social](https://enterprisedna.co/omni/instead-of/sprout-social)

## Quick start

Node 20 or later. No separate database installation for the demo.

```bash
git clone https://github.com/Enterprise-DNA-OS/social-operations-for-claude-code.git
cd social-operations-for-claude-code
npm install
npm run demo
npm run social -- weekly-review
npm run view
npm run docs
```

Open the folder with Claude Code, Codex, OpenCode or Cursor. Start with /weekly-review. Every runtime follows CLAUDE.md through AGENTS.md and the same command recipes. PGlite stores local data. DATABASE_URL selects PostgreSQL with a trusted operator account. Never seed a shared database. DATA_DIR changes the local storage location; OUTPUT_DIR changes report output.

The fictional Kauri Outdoors demo has an overdue launch with missing advertising evidence, a stale unassigned draft, an approved care post, two published posts and a stale performance snapshot with unknown clicks. Dates are relative to today. Seeding twice preserves existing records on the same day.

## What the team does every week

Monday: /weekly-review combines attention, approvals, campaign results and metric gaps. Before the review: /calendar and /content-gaps show the planned week. At the review: /compliance identifies missing evidence and /approve records the person's exact decision. Friday: /performance and /campaign-review show the latest exported results; /draft-review writes the report. /owner-load shows where work is waiting.

The free build manages records and review work. It does not publish, schedule network posts, collect live metrics, provide a social inbox or replace listening data. Native networks or an agreed publishing connection handle delivery. This is useful from CSV exports without network credentials. Enterprise DNA scopes those connections and review screens in the custom version.

## Approval evidence follows the content

Each post has a revision. Changing its content, profile, campaign, planned time, advertising flag, disclosure evidence, claim evidence or rights date increments the revision and invalidates approval. approve requires the exact current revision, a named actor and human-supplied evidence. Approval is blocked by missing ownership, schedule or current checks. record-published records a completed external publication; it never sends anything.

/compliance checks advertising identification evidence against NZ ASA or AU AANA guidance and applies documented house policies for claim references and asset-rights expiry. A person must inspect the actual claims, visual prominence and licence scope. This is an evidence checklist, not legal certification. [Rules and sources](docs/compliance.md).

## Ten questions you can ask now

These are tested questions across your own workflow and export history. No unsupported claim is made that Sprout cannot answer them.

1. Which planned posts are already late, and who owns them? /attention
2. Which approval no longer applies to the current revision? /approval-queue
3. Which advertising drafts have no identification review evidence? /compliance
4. Which asset licences expire before the intended use date? /compliance
5. Which profiles have no content planned for the next week? /content-gaps
6. Who has the most overdue posts, including unassigned work? /owner-load
7. Which published posts have old snapshots or unknown clicks? /metric-gaps
8. What was the recorded performance of a post on each export date? /metric-history
9. How many campaign posts remain in draft or review, beside their latest known clicks? /campaign-review
10. Who changed a post, what changed and what evidence did they record? /activity

Latest metrics use one observation per post, never the sum of successive cumulative snapshots. Missing metrics remain unknown, not zero. Campaign reports show missing-click counts beside known totals. Network definitions differ; engagement and click rates are for comparable within-network data. Imported records retain the original columns and provenance. History is editable by database administrators, not a tamper-proof audit system.

## Bring your history

Export Sprout's Post Performance report as CSV, then run:

```bash
npm run social -- import sprout-social --file=examples/sprout-posts.csv --as-of=2026-11-01 --actor="Your name" --dry-run
```

Remove --dry-run after inspecting the mapping. The sample is fictional. Real exports with different headers use --map; ambiguous dates need explicit conversion first. Import preserves published text, identity, dates, links, selected metrics and raw columns. It does not bring over media, inboxes, drafts or historical approvals. [Export steps and limits](docs/replace-sprout-social.md).

Repeated files are idempotent. Conflicting data needs --update after review. A failed row rolls back the batch. Export writes all records and provenance to a private JSON archive and refuses to overwrite files. Use database backups for restoration.

## Documents and views

Change brand.json for the business name, colours and logo. npm run docs renders a campaign brief and content approval record. npm run view renders the week, results and evidence review. /draft-calendar and /draft-review write private HTML drafts. Generated reports are read-only snapshots. [What a screen adds](docs/why-no-front-end.md).

## Commands

30 CLI commands and 34 slash recipes. Every CLI command supports --json. Writes require --actor. Case-insensitive names and partial IDs are supported; ambiguity lists candidates and exits 1. [Arguments and examples](docs/cli.md).

- /activity
- /add
- /add-campaign
- /add-profile
- /approval-queue
- /approve
- /attention
- /calendar
- /campaign-review
- /campaigns
- /compliance
- /content-gaps
- /customise
- /docs
- /draft-calendar
- /draft-review
- /export
- /help
- /import
- /imports
- /list
- /log
- /metric-gaps
- /metric-history
- /new-view
- /owner-load
- /performance
- /profiles
- /record-metrics
- /record-published
- /show
- /update
- /view
- /weekly-review

## Your first hour: ten things to ask for

1. Put our name and colours on the campaign brief.
2. Import one Sprout export without saving it.
3. Map our profile and caption headers.
4. Assign our content owners.
5. Set the correct advertising jurisdiction for each profile.
6. Add our product evidence references.
7. Show all posts waiting on one reviewer.
8. Add a campaign cost field without changing historical metrics.
9. Produce a Friday report showing unknown data explicitly.
10. Add a read-only view grouped by our brands.

/customise writes a numbered migration, updates validation and tests, then applies the authorised change. /new-view adds a read-only report. There is one workflow library and no application front end.

## Price context

Sprout Advanced lists US$399 per seat/month on annual billing. Twenty seats imply US$95,760/year. This is a public-rate scenario, not a measured customer invoice or an all-in quote. [Vendor pricing](https://sproutsocial.com/pricing/), checked 1 November 2026. Smaller teams and different plans cost less. [Selection evidence](docs/research.md).

## Verification and operation

npm test uses temporary PGlite storage, migrates and seeds twice, exercises every CLI command and checks revision approvals, invalid dates, ambiguity, zero denominators, missing metrics, import idempotency, conflict rollback, source preservation, exports, drafts and escaped HTML. CI runs Linux and Windows on Node 20/22 and a separate disposable PostgreSQL job. A CI definition is not proof it passed; inspect the run.

RLS and revoked public privileges require a trusted database operator role. This is not a multi-tenant service. Restrict local files and database access, configure backups and protect generated reports. No tokens are needed for the export-driven workflow. Hosting and agent subscriptions carry separate costs.

## Built and run for you

Omni by Enterprise DNA brings across your agreed records, builds the rules and documents around your business, and scopes shared access, a web front end, publishing connections or a different stack when needed. One setup fee, then a retainer. [Book 30 minutes with Sam](https://enterprisedna.co/omni/book/?offer=replace-software&utm_source=github&utm_medium=readme&utm_campaign=sprout-social).

MIT. Not affiliated with Sprout Social or Anthropic.
