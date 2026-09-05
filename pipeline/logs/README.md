# Run logs

One file per nightly run, `YYYY-MM-DD.md`, written by
`.github/workflows/nightly-ingestion.yml` and persisted to the
`pipeline-state` branch along with the rest of `pipeline/`.

Each log holds a header (window, limits, whether the paid stages ran, a link
back to the Actions run), the full stdout of every stage, and an outcome block
with the job status and candidate count. A stage that fails still leaves its
output behind, which is the point — the Actions tab expires, this does not.

What to look at in the morning, roughly in order:

- **Outcome → job status.** Anything but `success` and the rest is context.
- **Stage 1 counts.** A sudden drop in candidates usually means OpenAlex's
  arXiv indexing lagged, not that the field went quiet. The trailing window
  and the seen-ledger are designed to heal that on the next run.
- **Stage 2 verdicts.** The `about_capability: false` share is the keyword
  matcher's false-positive rate. If it climbs, a capability's `match_terms`
  is too broad or wants a `discriminator`.
- **Stage 2b proposals.** Names appearing across several papers are real
  gaps; a name backed by 1 paper is usually that author's framing.
- **Stage 3 briefs.** `UNGROUNDED FIGURE(S)` means a digest contains a number
  absent from the source it was written from. Read those before trusting them.

`local-briefs-*.log` files are from manual `npm run summarize` runs, kept for
the same reason.
