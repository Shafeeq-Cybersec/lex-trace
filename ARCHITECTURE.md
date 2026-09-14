# TRACE architecture

## Product boundary
A renter has received itemized deposit deductions and needs to inspect the supporting records. The central loop is **evidence → deduction review → source verification → new evidence → a separately published revision → what changed**. TRACE supports INR-denominated rental cases in this prototype. It does not determine liability or provide legal research.

## Runtime
React/Vite serves a calm deduction-first workspace. Express owns validation, sessions and jobs. SQLite WAL transactions persist cases, jobs, sources and original bytes on one persistent instance. The production Express server serves the compiled frontend and API on the same origin.

`src/App.tsx` owns selected case/revision, intake and polling. Contextual source inspection and a printable selected-revision report are separate components. Confirmed server state governs revisions; uploads do not optimistically create findings.

## Evidence pipeline
1. Validate extension, signature, size and text encoding before retaining files. SHA-256 deduplicates exact bytes within the case.
2. Extract PDF text by actual page with PDF.js. Preserve original bytes. Image observations and scanned PDF transcriptions use Gemini and are labeled.
3. Send bounded case text, methods and previous findings to a structured Gemini assessment. No external retrieval.
4. Validate the Zod result, source IDs, pages, quote inclusion, attribution method and duplicate issue IDs.
5. A second bounded model request checks semantic support, amounts, negation, speaker and prohibited liability conclusions. This is a guard, not a hallucination guarantee.
6. Publish a revision only after checks pass and the job ID/generation still match. Failures preserve the last published review.

## Data model
Case owns Source records and Revisions. Source records retain actual-byte hashes, original blobs, extraction method and ordered page text. A Citation resolves a source, page, excerpt and method. A Finding contains the deduction claim, amount, support/challenge/qualification/context relationships, evidence gaps and limitations. A Revision snapshots sources and findings, stores financial citations and a model audit, and computes changes from stable finding IDs.

Original evidence is immutable. Adding a statement creates a separate attributed source. No edit overwrites earlier evidence. A source observation is not an authenticated fact. There is no separate graph database or bloated fact ontology.

## Reassessment and concurrency
Every accepted job reserves the case before work starts. Mutations while a job is active return 409. Global concurrency is two jobs; source extraction uses pairs. Original files survive failed extraction. Successful results commit case/revision/job changes in a transaction. Startup marks interrupted jobs failed so users can retry. The prior revision stays selected until the user opens the new review.

Diffs include amount, claim, summary, status, supporting evidence, gaps and limitations. A disappeared issue is labeled absent from the current review, never described as a withdrawn charge. New source links explain which records were considered, not proof of causality.

## Efficiency and observability
Ready source extractions are reused. Exact duplicate uploads create no new job. Fully validated assessments have a private case-scoped LRU cache: 50 entries, one-hour TTL, keyed by model, instruction and full case reasoning input including prior findings. This is an in-process optimization, not durable distributed caching. Case deletion/expiry invalidates its cache scope.

Structured completion/failure logs contain job/revision IDs, duration and token counts, not document content. /api/health reports configuration and cache size; it does not assert that the provider is currently reachable. /health is a lightweight process probe. Actual model input/output is available only in the owning case's AI audit.

## Problem Statement Use Case Coverage
The wording below is taken from the supplied use-case list. This table deliberately distinguishes implementation from unsupported claims; the official brief's compulsory versus illustrative status must be verified before submission.

| Use Case | TRACE implementation and boundary |
|---|---|
| Simplifying complex legal documents | server/ai.ts INSTRUCTION and runCaseReconciliation explain deduction-related claims and evidence; src/components/DeductionCard.tsx renders them. No full contract simplifier. |
| Comparing contracts, agreements, or policies | **Not implemented as contract-to-contract comparison.** TRACE compares heterogeneous records concerning the same deduction. Do not claim full coverage of this use case. |
| Highlighting important clauses, obligations, risks, or inconsistencies | server/ai.ts structured findings and evidence relationships; DeductionCard and SourceInspector show relevant excerpts and differences. No legal risk scoring. |
| Answering questions based on provided legal documents | The structured deduction review answers what supports/challenges each claim and what remains unknown. **No arbitrary document Q&A interface.** |
| Helping users understand their options and potential next steps | Each finding's evidence gaps explains which record would clarify the issue and why; DeductionCard displays “Evidence still needed.” These are preparation steps, not legal strategies. |
| Generating summaries, checklists, or other actionable outputs | src/components/PrintReview.tsx exports a selected-revision brief with claims, source quotations, gaps and limits through the browser print/PDF flow. |
| Helping users prepare information or questions for a legal professional | Printable brief and evidence-gap prompts organize the submitted information for professional review. No professional referral or legal advice. |

## Operational boundary
One instance, persistent disk, Node 24+, HTTPS in production. No cross-device login, collaboration, multi-instance job queue, automatic legal outcomes, source deletion within a revision, or automated model fallback. Adding providers cannot fix attribution failures. Scale only after observed load warrants a durable queue and external object storage.
