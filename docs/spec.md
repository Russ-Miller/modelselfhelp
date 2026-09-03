# modelselfhelp — product and data specification

Version 0.2, 2026-09-03. This document is the source of truth for the seed
phase. Change it in the same pull request as the code that changes behavior.

## 1. Purpose

A one-stop exchange where humans and AI agents can:

1. Look up known capabilities of AI models — things AI, and often humans,
   are good or bad at — scoped to a model version and a usage context, not
   just "models in general".
2. See the evidence: papers and benchmarks that measure the capability.
3. Find techniques that improve a capability, with pointers to runnable code
   in a git repository.
4. Contribute: add evidence, add techniques, and record new claims about
   how a specific model performs, with provenance for every contribution.
5. Ask programmatically, so an agent can query "how am I rated on this
   capability in this context, and what should I do about it" at runtime.

Analogy for pitching: CWE for model capabilities and behavior. CWE names
stable weakness patterns and links mitigations; CVE records each concrete
instance. Here, a Capability is the pattern (named neutrally, since a
capability can be a strength or a weakness depending on the model and
context) and a Claim is the instance: one model's score on it. Scope is
broader than security: reasoning, knowledge, behavior, reliability,
security and evaluation.

## 2. First users

Agent developers first, researchers second. The differentiating feature is
the machine-readable API and MCP server, so that is built before discussion
features. Human contribution goes through pull requests during the seed
phase and through the site once accounts exist (milestone 4).

## 3. Entity model

Five content entities live in `catalog/` as YAML, one file per record.
Account entities live in Postgres (milestone 4). Every content record has an
`id` slug that is permanent once merged.

### Capability  (`catalog/capabilities/<id>.yaml`)
The stable, named pattern — a neutral axis a model can score well or badly
on, not an assumed weakness. Timeless by design.

| field | type | notes |
|---|---|---|
| id | slug | permanent |
| label | string | plain-English name, a few words |
| summary | string | one sentence |
| description | string | what the capability is, in general |
| strong_performance_looks_like | string | concrete anchor near the top of the scale |
| weak_performance_looks_like | string | concrete anchor near the bottom of the scale |
| group | slug | top-level taxonomy group, see §4 |
| parent | slug? | optional parent capability, for variants |
| aliases | string[] | other names used in the literature |
| contexts | slug[] | usage contexts where it is most often observed, see §5 |
| evidence | Evidence[] | foundational or definitional paper refs, see below |
| techniques | slug[] | techniques that improve it |
| status | enum | `proposed`, `accepted`, `disputed`, `retired` |
| related | slug[] | other capabilities |

Evidence entry (inline inside a capability or claim): a plain citation, not
a scored judgment — the claim's `score` carries the direction and
magnitude, so evidence just backs it up.

| field | type | notes |
|---|---|---|
| paper | slug | must exist in `catalog/papers/` |
| note | string | one or two sentences on what the paper shows |
| strength | enum | `anecdotal`, `benchmark`, `controlled`, `survey` |

### Paper  (`catalog/papers/<id>.yaml`)
A citable source. Id is `arxiv-<number>` for arXiv papers, otherwise a
slug. Titles of arXiv papers are verified against the arXiv API by
`npm run verify-papers`.

Fields: `id`, `title`, `authors` (string[]), `year`, `arxiv_id?`, `url`,
`venue?`, `abstract?`, `tags` (string[]), `code_url?`.

### Technique  (`catalog/techniques/<id>.yaml`)
A mitigation. Should point at runnable code.

Fields: `id`, `label`, `summary`, `description`, `addresses` (capability
slugs), `kind` (enum: `prompting`, `retrieval`, `tooling`, `training`,
`decoding`, `architecture`, `process`), `papers` (paper slugs),
`repos` (list of `{url, note, verified_on?}`), `contexts` (slugs),
`caveats` (string), `status` (same enum as capability).

### Model  (`catalog/models/<id>.yaml`)
A model family with versions. Fields: `id`, `label`, `vendor`,
`versions` (list of `{id, label, released?}`), `url?`.

### Claim  (`catalog/claims/<id>.yaml`)
One capability × one model version × one context × one date: how well that
model actually performs, on a 1-10 scale. Claims rot and are expected to
be superseded as models change.

| field | type | notes |
|---|---|---|
| id | slug | `<capability>-<version>-<context>-<yyyy-mm-dd>`, single hyphens throughout |
| capability | slug | |
| model | slug | model id |
| version | slug | version id within the model |
| context | slug | see §5 |
| observed_on | date | |
| score | integer | 1-10; 1 = weak_performance_looks_like, 10 = strong_performance_looks_like |
| status | enum | `open`, `mitigated`, `resolved`, `disputed`, `superseded` |
| superseded_by | slug? | later claim |
| evidence | Evidence[] | same shape as above; may also cite benchmark runs |
| notes | string | justify the score, especially anything between the two anchors |
| submitted_by | string | provenance: `human:<handle>` or `agent:<handle>` |

No fixed rubric exists yet for the rungs between 1 and 10 — a contributor
justifies the number in `notes`. Revisit if scores start disagreeing across
similar claims.

### Contribution provenance
Every record carries `submitted_by` and, once accounts exist, the API
stamps `submitted_by` from the token. Format: `human:<github-login>` or
`agent:<agent-name>@<owner-login>`; agents also record `agent_model`.

## 4. Taxonomy (top-level groups)

Defined in `catalog/taxonomy.yaml`. Groups are deliberately broad so the
breadth of scope is obvious at a glance.

| group | covers |
|---|---|
| reasoning | arithmetic, logic, planning, compositional generalization |
| knowledge | factual recall, verification, long-tail facts, temporal facts |
| context | long-context use, state tracking, memory within and across sessions |
| behavior | sycophancy, over-refusal, instruction following, calibration |
| agentic | tool use, procedure following, self-repair, goal conflicts |
| security | prompt injection, insecure code, package hallucination |
| evaluation | judge biases, benchmark contamination, self-evaluation |

## 5. Usage contexts

A closed list in `catalog/taxonomy.yaml`, extended by pull request.
Initial: `general`, `coding-agent`, `chat-assistant`, `rag-qa`,
`data-analysis`, `math`, `multilingual`, `long-document`, `llm-as-judge`,
`autonomous-agent`, `customer-support`.

## 6. Validation

`npm run validate` (part of `npm test`) checks:
- every YAML file against its JSON Schema in `catalog/schema/`;
- referential integrity: every paper, technique, capability, model, version,
  group and context referenced exists;
- id equals filename; slugs are kebab-case; no duplicate ids;
- every claim's `score` is an integer 1-10 and `observed_on` is a valid
  date not in the future.

`npm run verify-papers` fetches titles from the arXiv API for every paper
with an `arxiv_id` and fails on mismatch (normalized, case-insensitive).

## 7. Site (milestone 2)

Routes:
- `/` overview: groups, counts, recently added
- `/capabilities`, `/capabilities/[id]`
- `/techniques`, `/techniques/[id]`
- `/papers/[id]`
- `/models`, `/models/[id]` per-model view of claims by version and context
- `/search` full-text over label, summary, description, aliases

Rendered server-side from the catalog at build time; catalog changes deploy
through the normal PR flow. No database needed for reads in the seed phase.

## 8. API and MCP (milestone 3)

REST, JSON, versioned under `/api/v1`. Reads are public and rate-limited;
a token raises the limit. Writes require a token with `write` scope.

- `GET /api/v1/capabilities?group=&context=&q=`
- `GET /api/v1/capabilities/{id}`
- `GET /api/v1/techniques?addresses=`
- `GET /api/v1/models/{id}/claims?version=&context=&status=`
- `GET /api/v1/advise?model=&version=&context=` — the agent self-awareness
  call: open claims for that model/version/context plus the techniques that
  address them, ordered by ascending score (lowest, i.e. weakest, first).
- `POST /api/v1/claims`, `POST /api/v1/evidence`, `POST /api/v1/techniques`
  (milestone 4) — create as `proposed`; a maintainer promotes via PR.

MCP server exposes the same as tools: `list_capabilities`, `get_capability`,
`advise`, `find_techniques`, `submit_evidence`, `submit_claim`.
Transport: streamable HTTP at `/api/mcp`, sharing the REST handlers.

## 9. Accounts and tokens (milestone 4)

- Login: GitHub OAuth via Auth.js. Account record: github login, display
  name, created_at.
- Tokens: hashed at rest, scopes `read` and `write`, fields `kind`
  (`human` or `agent`), `agent_name?`, `agent_model?`, `last_used_at`.
- No agent detection by heuristics. Agents identify themselves by token and
  get higher rate limits and attribution in return.
- Rate limits: anonymous low, token higher; enforced per IP or per token.

## 10. Ingestion pipeline (milestone 5)

Python, in `pipeline/`. Runs on a schedule in GitHub Actions.
1. Pull arXiv metadata (title, abstract, categories) for cs.CL, cs.AI,
   cs.LG, cs.SE, cs.CR from the OAI-PMH bulk feed. Never full text at this
   stage.
2. Cheap filter: category plus keyword list from the taxonomy.
3. Embed abstracts; cluster against existing capability descriptions.
4. Send only candidates to a small model via the Batch API with a cached
   system prompt: does this paper measure a capability, propose a
   technique that improves one, or neither, and which slugs.
5. Write candidates to a review queue (`pipeline/queue/*.yaml`); a human
   or maintainer agent promotes to the catalog by PR.
Cost is measured on a one-month sample before scaling to three years.

## 11. Non-goals for the seed phase

Billing, organizations, private content, file hosting, voting, comment
threads, and detecting unidentified agents.
