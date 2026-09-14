# Verification

## Deterministic suite
Run npm test. Tests cover:
- Original two-page PDF extraction, page locations and hashes.
- Empty, spoofed, unsupported, HTML and oversized files.
- Wrong-source/page quotes, negation mismatches and method attribution.
- Material revision differences and immutable snapshots.
- Example/live boundaries.
- LRU recency, capacity, expiry and defensive copies.
- SQLite transactions, rollback, owner lists, interrupted-job recovery and cascading deletion.
- HTTP ownership, CSRF, original-byte retrieval, duplicate suppression, failed-model behavior, invalid uploads and compiled frontend availability.

The automated suite deliberately has no paid model dependency. Passing it does not establish model semantic accuracy or comprehensive accessibility conformance.

## Live test
scripts/live-smoke.mjs uses only the bundled fictional records. It creates a case, reviews real PDFs/text through Gemini, checks 60000 deposit/45000 refund and two deductions, submits a duplicate, adds a new record and checks stable IDs, source-linked changes and immutable history. It removes its disposable case after completion. docs/live-verification.json is generated only on a successful run.

## Browser acceptance
At desktop and 390-pixel widths: first-run intake; example label; source drawer and Escape/focus return; original source access; new revision explicit activation; previous revision selection; error recovery; print/PDF view; no horizontal page overflow. Keyboard and screen-reader semantics are reviewed, but no certification is claimed.

## AI evaluation before spending a submission attempt
Use an unseen set of at least 12 small fictional disputes, including one-sided allegations, negation, inaccurate amounts, irrelevant additions, no itemization, invoice-versus-payment, contradictory dates and prompt injection. Score extraction precision, source/page/quote accuracy, relationship support, useful gaps and inappropriate liability claims. Count refusals and latency as well as successes.

Compare against the same Gemini model with all records and a strong structured prompt, not a weak chatbot. A reviewer should be blinded to origin where possible. TRACE's advantage must be measurable workflow/provenance/revision reliability, not asserted superior intelligence. This larger semantic evaluation has not been completed by the deterministic suite.

## Release gate
Build, types and tests pass; live smoke passes on the actual deployment; citations open original records; example mode is obvious; no secrets/data in submitted archive; privacy settings match hosting; deployment URL tested in a fresh browser session. Do not spend an evaluation attempt solely because documentation got longer.
