# Bring Sprout Social post history across

1. In Sprout, open Reports and Post Performance. Select the profiles and date range. Use Share and export CSV. Read [Sprout's own export guide](https://support.sproutsocial.com/hc/en-us/articles/360052331251-How-do-I-use-the-Post-Performance-Report). Premium Analytics offers All Metrics, Table View and Custom exports. Export the required identity and metric columns.
2. Keep the original file privately. Record the export date, report range, timezone and selected metrics. This importer treats rows as cumulative observations as of the supplied date, not a change during the reporting window. Do not mix period-based measures into these columns.
3. Run the one-command import below with --dry-run. Compare profile and post counts, date parsing and the selected metrics. Remove --dry-run to save the whole batch atomically.

```bash
npm run social -- import sprout-social --file=imports/posts.csv --as-of=2026-11-01 --actor="Your name" --dry-run
```

## Mapping

The vendor confirms CSV export but does not guarantee a single header set across networks and report configurations. examples/sprout-posts.csv is a fictional compatibility fixture, not a downloaded customer file. Default aliases: Network or Social Network; Profile or Profile Name; Post ID or Message ID; Post Link, Permalink or Post URL; Post, Message or Post Text; Date, Published Date or Post Date; Impressions; Engagements; Post Link Clicks or Link Clicks. Either a stable ID or permalink is required. Network, profile, body and publication date are required.

For different headers pass --map=imports/mapping.json, an object with optional id, url, profile, network, body, published, impressions, engagements and clicks keys mapped to exact export headers. Missing required values fail before writing. ISO dates and timestamps with explicit timezones are supported. Convert ambiguous local dates explicitly before import; do not guess day/month order or timezone. Check the sample before committing to a migration.

Every original column is retained in source_rows. The importer creates profiles and published records. Profile, network and source ID form the stable key, so keep the same identity columns across exports. Tags and extra metrics remain in raw provenance; they are not silently made into campaigns. Owners and jurisdictions need checking after import; new profiles default to NZ and imported posts have no owner. Set campaigns using update.

The same file and snapshot date are idempotent. New snapshot dates add history. Only the latest observation per post appears in totals. Blank, N/A and -- metrics stay unknown. Conflicting snapshots and changed source content require --update, with previous values recorded in activity. Reconcile before accepting changes. A bad row rolls back the entire batch.

## Agreed migration boundary

This import covers published post text, identity, links, dates and selected performance metrics. It does not import approval history, inbox conversations, saved drafts, media files, listening feeds, network credentials or scheduling settings. Keep those exports separately and agree their mapping with Enterprise DNA. Do not cancel Sprout until reporting and every publishing or inbox workflow you rely on has a checked replacement.

Live publishing connections, shared team access and network data collection are scoped custom work. The free version remains useful for review from exports without OAuth. Sprout and native networks use different engagement definitions and paid/organic coverage. Keep the export context and compare like with like. No claim is made that Sprout cannot produce these reports.
