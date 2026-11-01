# Social Operations for Claude Code

Run the content week for a brand team or agency: plan posts, record human approvals, inspect evidence gaps and review exported performance. Ask the operator for their business, named reviewers and review cadence when adapting the fictional demo.

Read docs/cli.md. One CLI is scripts/social.mjs. Every command accepts --json. Every mutation requires --actor. Read a record before changing it. Resolve an ambiguous name by listing the matches and requesting the exact code.

## Recurring jobs

- /profiles: `npm run social -- profiles`.
- /campaigns: `npm run social -- campaigns`.
- /calendar: `npm run social -- calendar`.
- /approval-queue: `npm run social -- approval-queue`.
- /attention: `npm run social -- attention`.
- /performance: `npm run social -- performance`.
- /campaign-review: `npm run social -- campaign-review`.
- /content-gaps: `npm run social -- content-gaps`.
- /owner-load: `npm run social -- owner-load`.
- /metric-gaps: `npm run social -- metric-gaps`.
- /compliance: `npm run social -- compliance`.
- /activity: `npm run social -- activity`.
- /imports: `npm run social -- imports`.
- /help: `npm run social -- help`.
- /list: `npm run social -- list`.
- /show: `npm run social -- show`.
- /weekly-review: `npm run social -- weekly-review`.
- /add-profile: `npm run social -- add-profile`.
- /add-campaign: `npm run social -- add-campaign`.
- /add: `npm run social -- add`.
- /update: `npm run social -- update`.
- /log: `npm run social -- log`.
- /approve: `npm run social -- approve`.
- /record-published: `npm run social -- record-published`.
- /record-metrics: `npm run social -- record-metrics`.
- /metric-history: `npm run social -- metric-history`.
- /import: `npm run social -- import`.
- /export: `npm run social -- export`.
- /draft-calendar: `npm run social -- draft-calendar`.
- /draft-review: `npm run social -- draft-review`.
- /docs: render campaign briefs and approval records.
- /view: render the week, results and review snapshots.
- /customise: write and test a migration for the requested field or rule.
- /new-view: add a read-only query and report.

Monday's review combines attention, approval-queue, campaign-review and metric-gaps. Unknown metrics stay unknown. Snapshots are cumulative observations, never sum snapshots from different dates for the same post. Network definitions differ, so rates are for within-network review.

Approvals apply to one exact revision. Only record a human decision with its evidence and name. Content, schedule, campaign, disclosure, claim or rights changes invalidate approval. Importing a published post does not fabricate approval evidence. The administrator can alter history; these records are not tamper-proof signatures.

Never send, publish, schedule network posts or delete records. Draft HTML remains in drafts/. record-published only records evidence of an external action already performed. No passwords or tokens are needed for CSV import. Live platform integrations are separate custom work.

PGlite is local by default. DATABASE_URL selects a trusted PostgreSQL operator account; RLS denies public access but this is not a multi-tenant application. Never demo-seed a shared database. DATA_DIR chooses local storage; OUTPUT_DIR chooses report output. Production permissions, encrypted storage and backups belong to the operator.

Run npm test before committing changes. TEST_DATABASE_URL is only for an empty disposable test database. All commands live in .claude/commands; AGENTS.md directs other runtimes here. Omni by Enterprise DNA installs and runs a customised version: https://enterprisedna.co/omni/book/?offer=replace-software&utm_campaign=sprout-social
