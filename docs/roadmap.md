# Roadmap

Re-sequenced 2026-09-08 around delivering usable slices rather than
completing a model. Each milestone is one branch, one pull request. The
previous sequencing (1r–5r, set 2026-09-03) is recorded at the bottom with
what actually happened to it, because two of those milestones were not
completed so much as routed around, and that is worth remembering.

**The operating rule:** ship a slice someone can use, watch what happens,
adjust. Russ is customer zero, not the only customer.

## Where this actually is

| | |
|---|---|
| 25 capabilities | 22 have at least one claim |
| 160 claims | 85 reviewed, 75 unreviewed and marked |
| 141 sources | papers, one vendor doc, one post |
| 21 techniques | 12 have an efficacy claim, 9 have none |
| nightly pipeline | fetch → triage → draft → file, running |
| public site | search, contest-a-claim, and a page saying how it is collected |

## Next

| # | slice | done when | why now |
|---|---|---|---|
| A | Fill the thin entry points | no capability has zero claims; fewer than 5 techniques have no efficacy claim | A visitor landing on an empty page learns nothing, and gaps at the entry points do the most damage to usefulness |
| B | Nightly runs without a hand on it | a week of runs completes with no manual step, and the log says what happened each morning | Growth should not depend on someone remembering |
| C | One outside reader | somebody who is not Russ has used it and said something | Everything about quality here is currently one person's judgment; that is the binding constraint, not volume |
| D | Close the loop on a challenge | an issue opened by someone else results in a filed contest | Proves the contribution path end to end, which is the whole thesis in miniature |

C is the one that matters and the one no amount of building achieves. It
needs the site put in front of a person.

## Later, deliberately

Design preserved in `docs/spec.md` §9 and `docs/ambitions.md`. Not scheduled,
and none of it should precede C.

| slice | note |
|---|---|
| Read API and MCP | for agent consumers, once there is enough here to be worth consuming |
| Accounts and write endpoints | partly bypassed already: challenges go through GitHub issues, which needed no accounts and gives public attributable history |
| Staleness re-checks | `check-sources` covers sources that mutate; claims going stale is still manual |
| Prediction before test | record an expectation before checking it |
| Self-improvement experiment | the smallest version is written up in `docs/ambitions.md`: one technique, one stage, measured on the held-out set |

## What happened to the 2026-09-03 plan

| was | outcome |
|---|---|
| 1r Reframe: new schema + worked example | done |
| 2r Bulk migration to the new schema | done |
| 3r Site rebuilt around the new model | done, and well past it — contested view, open questions, drafts, search |
| 4r Manual re-check workflow | **bypassed.** Built a draft-review page instead. The thing that needed reviewing turned out to be incoming claims, not ageing ones |
| 5r Catalog growth "at whatever pace" | overtaken. An ingestion pipeline now drafts claims from papers automatically, which was not in the plan at all |

Two lessons in that table. The 4r workflow was designed for a problem that
had not appeared yet, and the real problem — review capacity against
incoming volume — was invisible until there was volume. And 5r assumed
growth would be slow and manual, which stopped being true the moment
drafting cost about fifteen cents a paper.

Both were reasonable plans that reality moved past, which is the argument
for planning one slice ahead rather than five.
