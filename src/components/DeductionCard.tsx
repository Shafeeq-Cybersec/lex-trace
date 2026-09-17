import type { Citation, Finding } from "../../shared/types.js";
import { money } from "../../shared/types.js";
import { Cite } from "./UI.js";
import { ArrowDownRight, ArrowUpRight, Minus, HelpCircle } from "lucide-react";
export function DeductionCard({
  finding,
  onSelectCitation,
}: {
  finding: Finding;
  onSelectCitation: (c: Citation) => void;
}) {
  const groups = [
    { role: "supports", title: "What supports the claim", icon: ArrowUpRight },
    {
      role: "challenges",
      title: "Where the records differ",
      icon: ArrowDownRight,
    },
    { role: "qualifies", title: "What changes the picture", icon: Minus },
    { role: "context", title: "Relevant context", icon: Minus },
  ];
  return (
    <article className="finding" aria-labelledby="finding-title">
      <div className="eyebrow">DEDUCTION REVIEW</div>
      <div className="finding-heading">
        <h2 id="finding-title" tabIndex={-1}>
          {finding.title}
        </h2>
        <span className="finding-amount">{money(finding.amount)}</span>
      </div>
      <div className={"status status-" + finding.status}>
        {finding.statusLabel}
      </div>
      <p className="assessment">{finding.summary}</p>
      <div className="claim">
        <span className="eyebrow">THE STATED CLAIM · {finding.claimant}</span>
        <p>“{finding.claim}”</p>
        <Cite citation={finding.claimCitation} onSelect={onSelectCitation} />
      </div>
      {groups.map((g) => {
        const items = finding.evidence.filter((e) => e.role === g.role);
        return items.length ? (
          <section className="evidence-group" key={g.role}>
            <h3>
              <g.icon size={17} aria-hidden="true" />
              {g.title}
            </h3>
            {items.map((e) => (
              <div className="evidence-item" key={e.id}>
                <h4>{e.title}</h4>
                <p>{e.text}</p>
                <Cite citation={e.citation} onSelect={onSelectCitation} />
              </div>
            ))}
          </section>
        ) : null;
      })}
      <section className="interpretation">
        <span className="eyebrow">WHAT THE RECORDS ESTABLISH</span>
        <p>{finding.conclusion}</p>
      </section>
      {!!finding.gaps.length && (
        <section className="gaps">
          <h3>
            <HelpCircle size={18} aria-hidden="true" />
            What would help clarify this
          </h3>
          {finding.gaps.map((g) => (
            <div key={g.id}>
              <h4>{g.title}</h4>
              <p>{g.reason}</p>
            </div>
          ))}
        </section>
      )}
      {!!finding.limitations.length && (
        <details className="limitations">
          <summary>
            Limits of this assessment · {finding.limitations.length}
          </summary>
          <ul>
            {finding.limitations.map((l, i) => (
              <li key={i}>{l}</li>
            ))}
          </ul>
        </details>
      )}
    </article>
  );
}
