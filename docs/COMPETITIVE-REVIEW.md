# LexClear comparison — repository review, 14 September 2026

The supplied screenshot shows LexClear's evaluation score of 97/100. It does not reveal the scoring algorithm, prove a particular cause of deductions, or establish that a cache/doc change will produce 99. Ranking and remaining attempts were not independently verified.

Reviewed public repository: https://github.com/SabarishR08/lexclear (master branch). This was a source review, not a deployed penetration test or independent reproduction of the score. No competitor implementation code was copied.

## What deserves attention
LexClear makes its capabilities easy to inspect: clause analysis, comparisons, grounded Q&A, preparation output, tests and architecture documentation. These align visibly with the supplied legal-document use-case list. TRACE should match that clarity in evidence and documentation, while making narrower honest claims.

Its clause-analysis batch loop is sequential, while its embedding path uses bounded concurrency. Describing the whole application as having no bounded parallelism would be inaccurate.
Source: https://github.com/SabarishR08/lexclear/blob/master/lib/ai/gemini.ts

## Gaps visible in reviewed source
- The clause-analysis fallback returns the merged result if no clauses pass quote verification. That is a fail-open path in the reviewed source. TRACE rejects unverifiable results.
- A migration applies unrestricted document access policies. That is a concern to investigate, not proof the deployed app has that policy.
Source: https://github.com/SabarishR08/lexclear/blob/master/supabase/migrations/20260914000000_allow_public_access.sql

## How TRACE should compete
1. Demonstrate a real new-evidence revision with a preserved prior assessment and causal source links.
2. Let a judge open an exact original source and distinguish original text from model observations.
3. Show failure preservation and owner isolation with runnable tests, not security-score rhetoric.
4. Demonstrate bounded work, actual-byte deduplication and case-scoped caching with honest latency measurements.
5. Map the brief to implemented features without inventing contract comparison or general Q&A support.

Do not add a health route as a substitute for live readiness or assume multiple providers improve evidence reasoning. Do not claim seven-of-seven coverage unless the product actually implements every required use case. If all seven are mandatory, TRACE's current contract comparison and free-form Q&A gaps are material competition risks; verify the official brief before using an attempt.
