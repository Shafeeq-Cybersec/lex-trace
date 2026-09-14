import { money, type TraceCase, type Revision } from "../../shared/types.js";
export function PrintReview({
  currentCase,
  revision,
  onBack,
}: {
  currentCase: TraceCase;
  revision: Revision;
  onBack: () => void;
}) {
  const f = revision.financials;
  return (
    <main className="print-review">
      <div className="no-print print-actions">
        <button className="button" onClick={onBack}>
          ← Back to review
        </button>
        <button className="button primary" onClick={() => window.print()}>
          Print / save PDF
        </button>
      </div>
      <div className="eyebrow">TRACE · EVIDENCE REVIEW</div>
      <h1>{currentCase.title}</h1>
      <p>
        Revision {revision.number} ·{" "}
        {new Date(revision.createdAt).toLocaleString()} ·{" "}
        {revision.mode === "example"
          ? "Prepared synthetic example"
          : "AI-assisted review"}
      </p>
      <p>
        Deposit {f?.deposit != null ? money(f.deposit) : "not established"} ·
        Claimed deductions{" "}
        {money(revision.findings.reduce((s, f) => s + f.amount, 0))} · Refund
        stated {f?.refund != null ? money(f.refund) : "not established"}
      </p>
      {revision.findings.map((f) => (
        <section className="print-finding" key={f.id}>
          <h2>
            {f.title} · {money(f.amount)}
          </h2>
          <p>{f.summary}</p>
          <p>
            <strong>Claim:</strong> {f.claim} [
            {f.claimCitation.label || f.claimCitation.sourceId}, p.{" "}
            {f.claimCitation.page}]
          </p>
          {f.evidence.map((e) => (
            <p key={e.id}>
              <strong>
                {e.role}: {e.title}.
              </strong>{" "}
              {e.text}
              <br />
              <small>
                “{e.citation.quote}” [{e.citation.label || e.citation.sourceId},
                p. {e.citation.page}]
              </small>
            </p>
          ))}
          <p>
            <strong>Assessment:</strong> {f.conclusion}
          </p>
          {f.gaps.map((g) => (
            <p key={g.id}>
              <strong>Still needed: {g.title}.</strong> {g.reason}
            </p>
          ))}
          <ul>
            {f.limitations.map((l, i) => (
              <li key={i}>{l}</li>
            ))}
          </ul>
        </section>
      ))}
      {!revision.findings.length && (
        <p>No itemized deductions were established in this review.</p>
      )}
      <h2>Records included in this revision</h2>
      {revision.sourceSnapshots.map((s) => (
        <div className="print-source" key={s.id}>
          <strong>{s.title}</strong>
          <p>
            {s.status} · {s.extractionMethod || "example"} · {s.id}
          </p>
          <small>SHA-256: {s.hash}</small>
        </div>
      ))}
      <footer>
        This review organizes submitted evidence. It does not determine legal
        liability, entitlement, document authenticity or deposit recovery. Only
        the selected revision is included. AI output can be wrong; verify cited
        original records.
      </footer>
    </main>
  );
}
