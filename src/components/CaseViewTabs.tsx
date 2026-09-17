import type { ReactNode } from "react";

export type CaseView = "review" | "evidence" | "changes";

export function CaseViewTabs({
  value,
  onChange,
  findingCount,
  sourceCount,
  changeCount,
  canCompare,
  children,
}: {
  value: CaseView;
  onChange: (view: CaseView) => void;
  findingCount: number;
  sourceCount: number;
  changeCount: number;
  canCompare: boolean;
  children: ReactNode;
}) {
  const views = [
    { id: "review", label: "Deduction review", count: findingCount },
    { id: "evidence", label: "Evidence", count: sourceCount },
    {
      id: "changes",
      label: "What changed",
      count: changeCount,
      disabled: !canCompare,
    },
  ] as const;
  return (
    <div className="review-tabs">
      <div className="case-view-tabs" role="tablist" aria-label="Case views">
        {views.map((view) => (
          <button
            key={view.id}
            id={`case-tab-${view.id}`}
            role="tab"
            aria-selected={value === view.id}
            aria-controls="case-view-panel"
            tabIndex={value === view.id ? 0 : -1}
            disabled={"disabled" in view && view.disabled}
            onClick={() => onChange(view.id)}
            onKeyDown={(event) => {
              if (
                !["ArrowLeft", "ArrowRight", "Home", "End"].includes(event.key)
              )
                return;
              event.preventDefault();
              const enabled = views.filter(
                (v) => !("disabled" in v && v.disabled),
              );
              const index = enabled.findIndex((v) => v.id === view.id);
              const next =
                event.key === "Home"
                  ? 0
                  : event.key === "End"
                    ? enabled.length - 1
                    : (index +
                        (event.key === "ArrowRight" ? 1 : -1) +
                        enabled.length) %
                      enabled.length;
              const target = enabled[next];
              onChange(target.id);
              document.getElementById(`case-tab-${target.id}`)?.focus();
            }}
          >
            {view.label} <span>{view.count}</span>
          </button>
        ))}
      </div>
      {children}
    </div>
  );
}
