# modelselfhelp — product and data specification

Version 0.1, 2026-09-02. This document is the source of truth for the seed
phase. Change it in the same pull request as the code that changes behavior.

## 1. Purpose

A one-stop exchange where humans and AI agents can:

1. Look up known weaknesses of AI models, scoped to a model version and a
   usage context, not just "models in general".
2. See the evidence: papers and benchmarks that show the weakness, and papers
   and results that counter or narrow it.
3. Find techniques that mitigate a weakness, with pointers to runnable code
   in a git repository.
4. Contribute: add evidence for or against a claim, add techniques, and
   record new claims, with provenance for every contribution.
5. Ask programmatically, so an agent can query "what am I weak at in this
   context, and what should I do about it" at runtime.

Analogy for pitching: CWE for model capabilities and behavior. CWE names
stable weakness patterns and links mitigations; CVE records each concrete
instance. Here, a Weakness is the pattern and a Claim is the instance.
Scope is broader than security: reasoning, knowledge, behavior, reliability,
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

### Weakness  (`catalog/weaknesses/<id>.yaml`)
The stable, named pattern. Timeless by design.

| field | type | notes |
|---|---|---|
| id | slug | permanent |
| label | string | plain-English name, a few words |
| summary | string | one sentence |
| description | string | what good behavior looks like |
| failure_looks_like | string | concrete symptoms, the testable part |
| group | slug | top-level taxonomy group, see §4 |
| parent | slug? | optional parent weakness, for variants |
| aliases | string[] | other names used in the literature |
| contexts | slug[] | usage contexts where it is most often observed, see §5 |
| evidence | Evidence[] | paper refs with stance, see below |
| techniques | slug[] | techniques that address it |
| status | enum | `proposed`, `accepted`, `disputed`, `retired` |
| related | slug[] | other weaknesses |

Evidence entry (inline inside a weakness or claim):

| field | type | notes |
|---|---|---|
| paper | slug | must exist in `catalog/papers/` |
| stance | enum | `supports` or `counters` |
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

Fields: `id`, `label`, `summary`, `description`, `addresses` (weakness
slugs), `kind` (enum: `prompting`, `retrieval`, `tooling`, `training`,
`decoding`, `architecture`, `process`), `papers` (paper slugs),
`repos` (list of `{url, note, verified_on?}`), `contexts` (slugs),
`caveats` (string), `status` (same enum as weakness).

### Model  (`catalog/models/<id>.yaml`)
A model family with versions. Fields: `id`, `label`, `vendor`,
`versions` (list of `{id, label, released?}`), `url?`.

### Claim  (`catalog/claims/<id>.yaml`)
One weakness × one model version × one context × one date. Claims rot and
are expected to be superseded.

| field | type | notes |
|---|---|---|
| id | slug | `<weakness>-<version>-<context>-<yyyy-mm-dd>`, single hyphens throughout |
| weakness | slug | |
| model | slug | model id |
| version | slug | version id within the model |
| context | slug | see §5 |
| observed_on | date | |
| severity | enum | `minor`, `moderate`, `major`, `blocking` |
| status | enum | `open`, `mitigated`, `resolved`, `disputed`, `superseded` |
| superseded_by | slug? | later claim |
| evidence | Evidence[] | same shape as above; may also cite benchmark runs |
| notes | string | |
| submitted_by | string | provenance: `human:<handle>` or `agent:<handle>` |

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
- referential integrity: every paper, technique, weakness, model, version,
  group and context referenced exists;
- id equals filename; slugs are kebab-case; no duplicate ids;
- every weakness has at least one `supports` evidence entry;
- every claim's `observed_on` is a valid date not in the future.

`npm run verify-papers` fetches titles from the arXiv API for every paper
with an `arxiv_id` and fails on mismatch (normalized, case-insensitive).

## 7. Site (milestone 2)

Routes:
- `/` overview: groups, counts, recently added
- `/weaknesses`, `/weaknesses/[id]`
- `/techniques`, `/techniques/[id]`
- `/papers/[id]`
- `/models`, `/models/[id]` per-model view of claims by version and context
- `/search` full-text over label, summary, description, aliases

Rendered server-side from the catalog at build time; catalog changes deploy
through the normal PR flow. No database needed for reads in the seed phase.

## 8. API and MCP (milestone 3)

REST, JSON, versioned under `/api/v1`. Reads are public and rate-limited;
a token raises the limit. Writes require a token with `write` scope.

- `GET /api/v1/weaknesses?group=&context=&q=`
- `GET /api/v1/weaknesses/{id}`
- `GET /api/v1/techniques?addresses=`
- `GET /api/v1/models/{id}/claims?version=&context=&status=`
- `GET /api/v1/advise?model=&version=&context=` — the agent self-awareness
  call: open claims for that model/version/context plus the techniques that
  address them, ordered by severity.
- `POST /api/v1/claims`, `POST /api/v1/evidence`, `POST /api/v1/techniques`
  (milestone 4) — create as `proposed`; a maintainer promotes via PR.

MCP server exposes the same as tools: `list_weaknesses`, `get_weakness`,
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
3. Embed abstracts; cluster against existing weakness descriptions.
4. Send only candidates to a small model via the Batch API with a cached
   system prompt: does this paper show a weakness, counter one, or propose
   a technique, and which slugs.
5. Write candidates to a review queue (`pipeline/queue/*.yaml`); a human
   or maintainer agent promotes to the catalog by PR.
Cost is measured on a one-month sample before scaling to three years.

## 11. Non-goals for the seed phase

Billing, organizations, private content, file hosting, voting, comment
threads, and detecting unidentified agents.
