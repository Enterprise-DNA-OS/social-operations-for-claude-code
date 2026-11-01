# CLI reference

Run `npm run social -- help`. All commands accept --json. Flags accept --name=value or --name value. Reads: profiles, campaigns, calendar, approval-queue, attention, performance, campaign-review, content-gaps, owner-load, metric-gaps, compliance, activity, imports, list. weekly-review combines four read commands. show and metric-history take --ref (code, partial ID or case-insensitive title). Ambiguous references list matches and exit 1.

All writes require --actor with the person responsible. Examples use fictional data.

```bash
npm run social -- add-profile --name="Example NZ" --network=Instagram --owner=Mia --jurisdiction=NZ --actor=Mia
npm run social -- add-campaign --name="Winter notes" --owner=Mia --objective="Explain care instructions" --due=2027-06-01 --actor=Mia
npm run social -- add --code=SOC-NEW --profile="Kauri Outdoors NZ" --campaign="Summer trail kit" --title="Care note" --body="Use warm water" --owner=Mia --at=2027-01-10T09:00:00+13:00 --advertising=false --actor=Mia
npm run social -- update --ref=SOC-001 --disclosure="Reviewer checked prominent Ad label" --evidence="Approved product sheet" --rights=2027-12-31 --actor=Mia
npm run social -- show --ref=SOC-001
npm run social -- approve --ref=SOC-001 --revision=2 --decision=approved --evidence="Human approval record reference" --actor="Named reviewer"
npm run social -- log --ref=SOC-001 --note="Waiting for product team" --actor=Mia
npm run social -- record-published --ref=SOC-005 --at=2026-10-31T03:00:00Z --url=https://example.invalid/post/5 --evidence="External publication confirmed" --actor=Mia
npm run social -- record-metrics --ref=SOC-002 --as-of=2026-11-01 --impressions=1700 --engagements=105 --clicks=35 --evidence="Native export reference" --actor=Mia
npm run social -- import sprout-social --file=examples/sprout-posts.csv --as-of=2026-11-01 --actor=Mia --dry-run
npm run social -- export --file=exports/backup.json
npm run social -- draft-calendar
npm run social -- draft-review
```

Replace example dates and revision numbers with current evidence. update supports title, body, owner, at, advertising, disclosure, evidence (claim source), rights, campaign and state (draft, review, archived). Approval requires an owner, planned time and no current compliance findings. --decision=rejected records rejection. --update on metrics or import permits reviewed replacement of conflicting data and logs previous values. --dry-run is only for import and rolls back the whole batch.

An approval is a record, not authentication. CLI access is trusted operator access. Claims and disclosures need a person to inspect their substance. A text field filled in does not prove legal compliance.

export writes all business records as JSON in one consistent transaction and refuses to overwrite an existing file. It is an archive, not a database restore command; use PostgreSQL backup tools or copy closed local storage for restoration. drafts and exports are private and ignored by Git.
