# Captured demo runs

Fictional Kauri Outdoors data, captured 1 November 2026.

## The overdue content review

Which posts need attention this week?

```text
npm run social -- attention
code     title                owner  issue
  -------  -------------------  -----  ------------------------
  SOC-001  Trail pack launch    Mia    overdue plan
  SOC-003  Dealer visit draft          stale draft
  SOC-003  Dealer visit draft          unassigned owner
  SOC-004  Dealer repair guide  Leo    metrics missing or stale
```

## Approval tied to a version

Which planned posts have a current approval?

```text
npm run social -- approval-queue
code     title               owner  revision  decision  reviewed_revision  current_approval
  -------  ------------------  -----  --------  --------  -----------------  ----------------
  SOC-001  Trail pack launch   Mia    1         missing   unknown            false
  SOC-003  Dealer visit draft         1         missing   unknown            false
  SOC-005  Trail pack care     Mia    1         approved  1                  true
```

## Latest post results

What do the latest exported results say?

```text
npm run social -- performance
code     title                 network    campaign            as_of       impressions  engagements  clicks   engagement_pct  click_pct
  -------  --------------------  ---------  ------------------  ----------  -----------  -----------  -------  --------------  ---------
  SOC-002  Trail pack checklist  Instagram  Summer trail kit    2026-10-31  1600         96           32       6.00            2.00
  SOC-004  Dealer repair guide   LinkedIn   Dealer field notes  2026-10-22  900          18           unknown  2.00            unknown
```
