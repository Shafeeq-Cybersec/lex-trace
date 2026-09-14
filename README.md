# TRACE
**Understand what supports each deposit deduction, where the records differ, and what evidence is still needed.**

TRACE reviews rental-deposit evidence: PDFs, text messages, receipts, photographs and attributed user statements. The interface organizes deductions, links assessments to source pages, and preserves the previous review when new evidence arrives.

It is an evidence-review prototype, not a lawyer, liability decision, contract-comparison suite, or legal research service.

## Run
Requires Node.js 24+.
1. Run `npm ci`.
2. Copy `.env.example` to `.env` and set `GEMINI_API_KEY` locally. Never commit it.
3. Run `npm run dev`. Open http://127.0.0.1:5173.
4. For a compiled local build: `npm run build`, set `TRACE_PUBLIC_ORIGIN=http://127.0.0.1:3001`, then `npm start`.

No key is needed to explore the **prepared example**. Example results are synthetic and explicitly labeled; they never process user uploads. Live cases require Gemini. The default configured model is `gemini-3.8-flash`; access depends on your provider account.

## Try the real flow
Download the bundled files from `public/samples`. Upload 01, 02 and 03 together, review the two deductions, and inspect the original PDF citations. Then add 04 as new evidence and open the new revision. File 05 is an irrelevant-evidence challenge. All five records are fictional and labeled.

For a reproducible live test against a running dev server, run:
`TRACE_TEST_ORIGIN=http://127.0.0.1:5173 node scripts/live-smoke.mjs`
(PowerShell: set `$env:TRACE_TEST_ORIGIN='http://127.0.0.1:5173'` first.)
This test calls your provider with fictional records and uses quota. It checks accurate amounts, duplicate suppression, stable issue IDs, preserved revisions and source-linked changes.

## Quality checks
- `npm run typecheck`
- `npm test` — deterministic tests; no model key required
- `npm run build`
- `npm run format:check`
- `npm audit --omit=dev`

See [architecture](ARCHITECTURE.md), [security and retention](SECURITY.md), [testing](docs/TESTING.md), [submission text and demo](docs/SUBMISSION.md), and [competitive review](docs/COMPETITIVE-REVIEW.md).

## Deliberate engineering choices
- React + Vite frontend, Express backend, SQLite transactions and original-file blobs on one persistent server.
- Native PDF extraction; Gemini transcription/visual observations only where needed.
- Structured Gemini assessment followed by deterministic citation checks and a separate semantic verification call. Failed validation publishes nothing.
- Case-scoped LRU cache, SHA-256 duplicate-file detection, two concurrent review jobs, extraction in bounded pairs.
- Immutable revision snapshots, stable issue IDs, guarded publication, previous review visible during reassessment.
- Signed private browser sessions, ownership checks on every case/source/job route, same-origin mutation checks, 24-hour case expiry.
- No vector database, autonomous agents, cross-case cache, tracking analytics, or provider waterfall.

## Deployment limits
Dockerfile and Render configuration are included. Deploy one instance with persistent storage, HTTPS, a stable session secret and exact public origin. Do not put SQLite on an ephemeral serverless filesystem. Render's sample disk/service configuration has a cost; nothing is provisioned by this repository.

This is a serious prototype, not a production security certification. PDF parsing is in-process; sessions are browser-bound without account recovery; provider quotas and model mistakes remain possible. Use synthetic evidence for a public judging deployment until operational/privacy requirements are reviewed.
