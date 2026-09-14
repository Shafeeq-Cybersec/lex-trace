# Security and privacy

## Controls implemented
- Signed, HttpOnly, SameSite=Strict browser cookie; Secure under NODE_ENV=production.
- Case-owner checks cover lists, individual cases, original files, jobs, updates and deletion. Unknown and unauthorized IDs return 404.
- Mutations require the exact configured Origin and X-Trace-Request header. No wildcard CORS.
- Helmet security headers; API responses use no-store. React renders source text as text, not HTML.
- Allowlisted PDF/PNG/JPEG/TXT extensions and byte signatures; no HTML, SVG, office macros or archives. 10 MB/file; 12 files; 80 MB/case; six images; 30 combined PDF pages; bounded model text.
- Rate limits and bounded active jobs reduce accidental quota/memory exhaustion.
- Source instructions are untrusted data. The model has no tools, filesystem, browsing or outbound-action authority. Exact citation validation and semantic verification gate publication.
- Provider key stays server-side. .env, data directories, session keys and build artifacts are excluded from the submission package.
- Logs omit document text, user statements, credentials, original filenames and provider payloads.

## Data and retention
Collected: browser session identifier, case name, uploaded originals, extracted text/observations, user statements, generated reviews and their model audit. These are necessary for source inspection and revision history. No tracking analytics are included.

Live review sends extracted content and previous findings to Google Gemini; scans/images send original file bytes for transcription/observation. TRACE does not mask all PII before model processing. Upload consent and the privacy panel disclose this. Provider retention depends on the configured Google account/service terms; TRACE cannot delete provider-held records.

Cases expire 24 hours after creation and are removed on periodic cleanup while the server is running or at next startup. Explicit case deletion removes active database records, file blobs and jobs and invalidates cached reviews. SQLite/WAL media and host backups may retain residual copies; this is not a certified secure-erasure mechanism. Operators must configure host backup retention separately. Exports already downloaded are under the user's control.

A session is browser-bound and expires after 24 hours. Losing the cookie loses access; there is no password/account recovery. Server operators with filesystem access can access stored data. Production disk encryption and access permissions depend on the host.

## Known limitations
In-process PDF parsing is not a hardened malware sandbox. Signature checks do not prove a file harmless. Very complex files could exhaust resources. This single-instance prototype needs parser isolation, stronger abuse controls, recovery design and independent security review before broad sensitive-data use. Model verification cannot authenticate documents or eliminate semantic errors.

## Deployment checks
Set exact TRACE_PUBLIC_ORIGIN, stable high-entropy TRACE_SESSION_SECRET, NODE_ENV=production, server-side GEMINI_API_KEY and a persistent TRACE_DATA_DIR. Use HTTPS and one trusted reverse proxy. Restrict disk/backup access. Never expose database files or model debug payloads publicly. Rotate credentials that have been shared in chat before public deployment.
