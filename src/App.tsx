import { useEffect, useRef, useState } from "react";
import {
  ArrowRight,
  ArrowUpRight,
  Plus,
  FileText,
  Upload,
  ShieldCheck,
  X,
  Search,
  History,
  Check,
  LoaderCircle,
  Trash2,
  Download,
  ChevronRight,
  Layers,
  FolderOpen,
} from "lucide-react";
import type {
  Capabilities,
  CaseListItem,
  Citation,
  Job,
  TraceCase,
} from "../shared/types.js";
import { money, TERMINAL_JOBS } from "../shared/types.js";
import * as api from "./api.js";
import { Modal, Cite, ErrorNotice } from "./components/UI.js";
import { DeductionCard } from "./components/DeductionCard.js";
import { SourceInspector } from "./components/SourceInspector.js";
import { PrintReview } from "./components/PrintReview.js";
import { CaseViewTabs } from "./components/CaseViewTabs.js";

export default function App() {
  const [current, setCurrent] = useState<TraceCase | null>(null),
    [cases, setCases] = useState<CaseListItem[]>([]),
    [caps, setCaps] = useState<Capabilities | null>(null);
  const [loading, setLoading] = useState(true),
    [busy, setBusy] = useState(false),
    [error, setError] = useState(""),
    [notice, setNotice] = useState("");
  const [tab, setTab] = useState<"review" | "evidence" | "changes">("review"),
    [viewId, setViewId] = useState(""),
    [selected, setSelected] = useState("");
  const [inspect, setInspect] = useState<{
      id: string;
      citation?: Citation;
    } | null>(null),
    [modal, setModal] = useState<"add" | "privacy" | "audit" | "delete" | null>(
      null,
    ),
    [printing, setPrinting] = useState(false);
  const [job, setJob] = useState<Job | null>(null),
    [newReady, setNewReady] = useState(false);
  const [files, setFiles] = useState<File[]>([]),
    [title, setTitle] = useState(""),
    [statement, setStatement] = useState(""),
    [statementTitle, setStatementTitle] = useState("Additional user statement"),
    [consent, setConsent] = useState(false),
    [inputMode, setInputMode] = useState<"files" | "statement">("files");
  const inputRef = useRef<HTMLInputElement>(null),
    [drag, setDrag] = useState(false);
  const mounted = useRef(true);
  const mainRef = useRef<HTMLElement>(null);
  const exportRef = useRef<HTMLButtonElement>(null);
  const focusMainOnNavigation = useRef(false);
  const returnFromPrint = useRef(false);
  const [uploadFeedback, setUploadFeedback] = useState("");
  const revision =
    current?.revisions.find((r) => r.id === viewId) ||
    current?.revisions.at(-1);
  const finding =
    revision?.findings.find((f) => f.id === selected) || revision?.findings[0];
  const running = !!current?.activeJobId;
  const source =
    inspect &&
    (revision?.sourceSnapshots.find((s) => s.id === inspect.id) ||
      current?.sources.find((s) => s.id === inspect.id));
  const selectCitation = (citation: Citation) =>
    setInspect({ id: citation.sourceId, citation });
  const refreshList = async () => setCases(await api.fetchCases());
  function openCase(c: TraceCase) {
    focusMainOnNavigation.current = true;
    setCurrent(c);
    setViewId(c.latestRevisionId || "");
    setSelected(c.revisions.at(-1)?.findings[0]?.id || "");
    setTab("review");
    setJob(null);
    setNewReady(false);
    setInspect(null);
    localStorage.setItem("trace_v2_case", c.id);
  }
  useEffect(() => {
    if (loading || printing) return;
    if (returnFromPrint.current) {
      returnFromPrint.current = false;
      exportRef.current?.focus();
    } else if (focusMainOnNavigation.current) {
      focusMainOnNavigation.current = false;
      mainRef.current?.focus();
    }
  }, [current?.id, loading, printing]);
  useEffect(() => {
    mounted.current = true;
    (async () => {
      try {
        setCaps(await api.fetchCapabilities());
        const list = await api.fetchCases();
        if (!mounted.current) return;
        setCases(list);
        const saved = localStorage.getItem("trace_v2_case");
        if (saved && list.some((c) => c.id === saved)) {
          const data = await api.fetchCase(saved);
          if (mounted.current && data.case) openCase(data.case);
        }
      } catch (e) {
        if (mounted.current) setError((e as Error).message);
      } finally {
        if (mounted.current) setLoading(false);
      }
    })();
    return () => {
      mounted.current = false;
    };
  }, []);
  useEffect(() => {
    if (!current?.activeJobId) return;
    let cancelled = false;
    let timer: ReturnType<typeof setTimeout>;
    const caseId = current.id,
      jobId = current.activeJobId;
    const poll = async () => {
      try {
        const j = await api.fetchJob(caseId, jobId);
        if (cancelled) return;
        setJob(j);
        if (TERMINAL_JOBS.includes(j.status)) {
          const data = await api.fetchCase(caseId);
          if (cancelled || !data.case) return;
          setCurrent(data.case);
          setBusy(false);
          if (j.status === "completed") {
            setModal(null);
            setFiles([]);
            setStatement("");
            if (!viewId) {
              setViewId(data.case.latestRevisionId || "");
              setSelected(data.case.revisions.at(-1)?.findings[0]?.id || "");
            } else setNewReady(true);
            setNotice(
              "Review complete. Inspect its citations before relying on an assessment.",
            );
            void refreshList();
          } else
            setError(
              j.error ||
                "Review paused. Your files and previous review are saved. Retry when ready.",
            );
          return;
        }
        timer = setTimeout(poll, 1200);
      } catch (e) {
        if (cancelled) return;
        setError((e as Error).message);
        timer = setTimeout(poll, 5000);
      }
    };
    void poll();
    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [current?.id, current?.activeJobId]);
  async function action(work: () => Promise<void>) {
    setError("");
    setNotice("");
    setBusy(true);
    try {
      await work();
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }
  async function acceptJob(
    result: { jobId: string | null; message?: string },
    id: string,
  ) {
    if (result.message) setNotice(result.message);
    const data = await api.fetchCase(id);
    if (data.case) setCurrent(data.case);
    if (result.jobId)
      setJob({
        id: result.jobId,
        caseId: id,
        generation: 0,
        status: "queued",
        progress: 0,
        stage: "Starting your evidence review",
        createdAt: new Date().toISOString(),
      });
    else {
      setFiles([]);
      setModal(null);
    }
  }
  function stage(incoming: File[]) {
    const bad = incoming.find(
      (f) =>
        !f.size ||
        f.size > 10 * 1024 * 1024 ||
        !/\.(pdf|png|jpe?g|txt)$/i.test(f.name),
    );
    if (bad) {
      setError(
        "“" +
          bad.name +
          "” cannot be added. Use a non-empty PDF, PNG, JPEG or TXT file up to 10 MB. Your other records are unchanged.",
      );
      return;
    }
    if (files.length + incoming.length + (current?.sources.length || 0) > 12) {
      setError(
        "A case holds up to 12 records. Remove a staged file or start a smaller case.",
      );
      return;
    }
    setFiles((prev) => [
      ...prev,
      ...incoming.filter(
        (f) => !prev.some((p) => p.name === f.name && p.size === f.size),
      ),
    ]);
    setUploadFeedback(
      `${incoming.length} file${incoming.length === 1 ? "" : "s"} selected. Review the file list before submitting.`,
    );
    setError("");
  }
  const submit = () =>
    action(async () => {
      if (!consent)
        throw new Error(
          "Confirm the processing notice before submitting evidence.",
        );
      if (inputMode === "files" && !files.length)
        throw new Error("Choose at least one evidence file.");
      if (inputMode === "statement" && statement.trim().length < 5)
        throw new Error("Enter a statement with at least 5 characters.");
      let c = current;
      if (!c) {
        c = await api.createCase(title.trim() || "Rental deposit review");
        openCase(c);
      }
      const result =
        inputMode === "files"
          ? await api.uploadBatchFiles(c.id, files)
          : await api.addStatement(
              c.id,
              statement,
              statementTitle || "User-provided statement",
            );
      await acceptJob(result, c.id);
    });
  const retry = () =>
    current &&
    action(async () =>
      acceptJob(await api.retryReview(current.id), current.id),
    );
  function viewLatest() {
    if (!current) return;
    setViewId(current.latestRevisionId || "");
    setNewReady(false);
    setTab(current.revisions.length > 1 ? "changes" : "review");
    setInspect(null);
    requestAnimationFrame(() =>
      document.getElementById("case-view-panel")?.focus(),
    );
  }
  const uploadUI = (
    <div className="intake-form">
      <div
        className="input-switch"
        role="group"
        aria-label="Evidence input method"
      >
        <button
          aria-pressed={inputMode === "files"}
          onClick={() => setInputMode("files")}
        >
          Upload records
        </button>
        <button
          aria-pressed={inputMode === "statement"}
          onClick={() => setInputMode("statement")}
        >
          Add a statement
        </button>
      </div>
      {inputMode === "files" ? (
        <>
          <div
            className={"drop-zone " + (drag ? "dragging" : "")}
            onDragOver={(e) => {
              e.preventDefault();
              setDrag(true);
            }}
            onDragLeave={() => setDrag(false)}
            onDrop={(e) => {
              e.preventDefault();
              setDrag(false);
              stage(Array.from(e.dataTransfer.files));
            }}
          >
            <div className="upload-icon">
              <Upload size={24} />
            </div>
            <h3>Bring the records together.</h3>
            <p>
              Lease, deduction notice, receipts,
              <br />
              messages and photographs.
            </p>
            <input
              ref={inputRef}
              type="file"
              aria-label="Evidence files"
              accept=".pdf,.png,.jpg,.jpeg,.txt"
              multiple
              hidden
              onChange={(e) => {
                stage(Array.from(e.target.files || []));
                e.target.value = "";
              }}
            />
            <button
              className="button"
              aria-describedby="upload-formats"
              onClick={() => inputRef.current?.click()}
            >
              Choose files <Plus size={16} />
            </button>
            <small id="upload-formats">
              PDF, PNG, JPEG or TXT · 10 MB each · 12 records
            </small>
          </div>
          {!!files.length && (
            <ul className="staged">
              {files.map((f, i) => (
                <li key={f.name + i}>
                  <FileText size={17} />
                  <span>
                    {f.name}
                    <small>
                      {Math.max(1, Math.round(f.size / 1024))} KB · ready to
                      upload
                    </small>
                  </span>
                  <button
                    className="icon-button"
                    aria-label={"Remove " + f.name}
                    onClick={() => {
                      setFiles((v) => v.filter((_, j) => i !== j));
                      setUploadFeedback(
                        `${f.name} removed from the upload list.`,
                      );
                      inputRef.current?.parentElement
                        ?.querySelector<HTMLButtonElement>("button")
                        ?.focus();
                    }}
                  >
                    <X size={16} />
                  </button>
                </li>
              ))}
            </ul>
          )}
        </>
      ) : (
        <div className="statement-form">
          <label className="field">
            Record title
            <input
              value={statementTitle}
              maxLength={100}
              onChange={(e) => setStatementTitle(e.target.value)}
            />
          </label>
          <label className="field">
            What would you like to add?
            <textarea
              rows={7}
              maxLength={12000}
              value={statement}
              onChange={(e) => setStatement(e.target.value)}
              placeholder="Identify who said or observed what, and when. Preserve exact wording where possible."
            />
          </label>
          <p className="muted">
            Saved as user-provided information. It will not be treated as
            independent proof.
          </p>
        </div>
      )}
      <p className="sr-only" role="status" aria-atomic="true">
        {uploadFeedback}
      </p>
      <label className="consent">
        <input
          type="checkbox"
          checked={consent}
          onChange={(e) => setConsent(e.target.checked)}
        />
        <span>
          I can share these records for review. Live processing sends their
          content to Google Gemini. Cases are retained here for 24 hours.
        </span>
      </label>
      <details className="consent-details">
        <summary>Privacy details</summary>
        <p>
          Your records and AI assessments are stored on this server. This
          browser session and the server operator can access them. Google Gemini
          receives evidence content for live processing; its retention follows
          the API account terms. Deleting a case removes its active records
          here, but not exports, backups or provider logs.
        </p>
      </details>
      <button
        className="button primary full"
        onClick={submit}
        aria-describedby="intake-requirements"
        disabled={
          busy ||
          running ||
          !consent ||
          (inputMode === "files" && !files.length) ||
          (inputMode === "statement" && statement.trim().length < 5)
        }
      >
        {busy ? (
          <LoaderCircle className="spin" size={18} />
        ) : (
          <Search size={18} />
        )}{" "}
        {current ? "Add evidence & reassess" : "Start evidence review"}
        <ArrowRight size={17} />
      </button>
      <p id="intake-requirements" className="muted intake-requirements">
        {running
          ? "A review is already in progress."
          : !consent
            ? "Choose evidence and confirm the processing notice to start."
            : inputMode === "files" && !files.length
              ? "Choose at least one record to continue."
              : inputMode === "statement" && statement.trim().length < 5
                ? "Enter a statement of at least 5 characters to continue."
                : "Your records will be saved before review starts."}
      </p>
      {!caps?.liveAI && (
        <p className="setup-note">
          Live AI is not configured on this server. You can explore the clearly
          labeled example.
        </p>
      )}
    </div>
  );
  if (loading)
    return (
      <main id="main-content" className="boot" tabIndex={-1} role="status">
        <span className="brand-mark">T</span>
        <p>Opening TRACE…</p>
      </main>
    );
  if (printing && current && revision)
    return (
      <PrintReview
        currentCase={current}
        revision={revision}
        onBack={() => {
          returnFromPrint.current = true;
          setPrinting(false);
        }}
      />
    );
  return (
    <div className="app">
      <header className="app-header">
        <button
          className="brand"
          aria-label="TRACE home"
          onClick={() => {
            focusMainOnNavigation.current = true;
            setCurrent(null);
            setFiles([]);
            setJob(null);
            setNewReady(false);
            setInspect(null);
            localStorage.removeItem("trace_v2_case");
            void refreshList();
          }}
        >
          <span className="brand-mark">
            <Layers size={21} />
          </span>
          TRACE
          <span className="brand-divider" />{" "}
          <span className="brand-subtitle">Evidence, understood.</span>
        </button>
        <div className="header-right">
          <span className="private-label">
            <ShieldCheck size={14} />
            Private browser session
          </span>
          <button
            className="icon-button"
            aria-label="Privacy and retention"
            onClick={() => setModal("privacy")}
          >
            <ShieldCheck size={19} />
          </button>
        </div>
      </header>
      <div className="app-notices">
        {error && !modal && (
          <ErrorNotice message={error} onDismiss={() => setError("")} />
        )}
        <div role="status" aria-live="polite" aria-atomic="true">
          {notice && (
            <div className="notice notice-success">
              <Check size={17} />
              <span>{notice}</span>
              <button
                className="icon-button"
                aria-label="Dismiss notification"
                onClick={() => setNotice("")}
              >
                <X size={16} />
              </button>
            </div>
          )}
        </div>
      </div>
      {!current ? (
        <main
          id="main-content"
          className="home"
          ref={mainRef}
          tabIndex={-1}
          aria-labelledby="page-title"
        >
          <section className="home-copy">
            <div className="eyebrow">
              <span className="tiny-line" /> RENTAL DEPOSIT EVIDENCE REVIEW
            </div>
            <h1 id="page-title">
              Every deduction
              <br />
              has a story.
              <br />
              <span>Trace the evidence.</span>
            </h1>
            <p className="home-description">
              Understand what supports each charge, where the records differ,
              and what evidence is still needed.
            </p>
            <div className="home-steps">
              <div>
                <span>01</span>
                <p>
                  <strong>Bring your records.</strong>
                  <br />
                  One place for the lease, messages and photos.
                </p>
              </div>
              <div>
                <span>02</span>
                <p>
                  <strong>Follow the evidence.</strong>
                  <br />
                  Every assessment leads back to a source.
                </p>
              </div>
              <div>
                <span>03</span>
                <p>
                  <strong>See what changes.</strong>
                  <br />
                  New evidence. A clear, revisable account.
                </p>
              </div>
            </div>
            <button
              className="example-link"
              disabled={busy}
              onClick={() =>
                action(async () => {
                  openCase(await api.loadDemoCase());
                  await refreshList();
                })
              }
            >
              <span className="example-icon">
                <FolderOpen size={20} />
              </span>
              <span>
                <strong>Explore an example dispute</strong>
                <small>₹15,000 · 7 synthetic records · no AI call</small>
              </span>
              <ArrowUpRight size={19} />
            </button>
            <p className="scope-note">
              Evidence organization and dispute preparation.
              <br />
              Not a determination of legal liability.
            </p>
          </section>
          <section className="intake">
            <div className="intake-heading">
              <span className="eyebrow">YOUR FIRST REVIEW</span>
              <h2>Start with what you have.</h2>
              <label className="field">
                Case name <span className="optional">(optional)</span>
                <input
                  value={title}
                  maxLength={120}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="e.g. Park View deposit"
                />
              </label>
            </div>
            {uploadUI}
          </section>
          {!!cases.length && (
            <section className="recent">
              <div className="section-heading">
                <h2>Your recent cases</h2>
                <small>Available in this browser for 24 hours</small>
              </div>
              {cases.map((c) => (
                <button
                  className="case-row"
                  key={c.id}
                  onClick={() =>
                    action(async () => {
                      const data = await api.fetchCase(c.id);
                      if (data.case) openCase(data.case);
                    })
                  }
                >
                  <FolderOpen size={19} />
                  <span>
                    <strong>{c.title}</strong>
                    <small>
                      {c.isExample ? "Synthetic example" : "Live case"} ·{" "}
                      {new Date(c.updatedAt).toLocaleDateString()}
                    </small>
                  </span>
                  <ChevronRight size={18} />
                </button>
              ))}
            </section>
          )}
        </main>
      ) : (
        <main
          id="main-content"
          className="workspace"
          ref={mainRef}
          tabIndex={-1}
          aria-labelledby="page-title"
        >
          <div className="case-heading">
            <div>
              <div className="eyebrow">
                {current.isExample
                  ? "SYNTHETIC EXAMPLE · NO AI CALL"
                  : "YOUR EVIDENCE REVIEW"}
              </div>
              <h1 id="page-title">{current.title}</h1>
              <p>
                {current.sources.length} records ·{" "}
                {revision
                  ? "Viewing revision " + revision.number
                  : "Awaiting first review"}{" "}
                · Expires{" "}
                {new Date(current.expiresAt).toLocaleTimeString([], {
                  hour: "2-digit",
                  minute: "2-digit",
                })}
              </p>
            </div>
            <div className="case-actions">
              {!!current.revisions.length && (
                <label className="revision-select">
                  <span className="sr-only">Select revision</span>
                  <select
                    value={revision?.id}
                    onChange={(e) => {
                      setViewId(e.target.value);
                      setTab("review");
                      setInspect(null);
                    }}
                  >
                    {current.revisions.map((r) => (
                      <option key={r.id} value={r.id}>
                        Revision {r.number}
                        {r.id === current.latestRevisionId ? " · latest" : ""}
                      </option>
                    ))}
                  </select>
                </label>
              )}
              <button
                className="button"
                ref={exportRef}
                disabled={!revision}
                onClick={() => setPrinting(true)}
              >
                <Download size={16} />
                <span>Export</span>
              </button>
              <button
                className="button primary"
                aria-haspopup="dialog"
                disabled={busy || running || current.isExample}
                onClick={() => {
                  setFiles([]);
                  setError("");
                  setModal("add");
                }}
              >
                <Plus size={17} />
                Add evidence
              </button>
              <button
                className="icon-button"
                disabled={running}
                aria-label="Delete this case"
                aria-haspopup="dialog"
                onClick={() => setModal("delete")}
              >
                <Trash2 size={18} />
              </button>
            </div>
          </div>
          {current.isExample && (
            <div className="example-banner">
              <div>
                <strong>Explore the revision moment.</strong>
                <span>
                  {" "}
                  Add the prepared tenant statement and compare what changes.
                  This walkthrough uses fixed example results.
                </span>
              </div>
              <button
                className="button"
                disabled={
                  busy ||
                  running ||
                  current.sources.some((s) => s.id === "src-8")
                }
                onClick={() =>
                  action(async () =>
                    acceptJob(
                      await api.addDemoAddition(current.id),
                      current.id,
                    ),
                  )
                }
              >
                Add example statement <ArrowRight size={16} />
              </button>
            </div>
          )}
          {(running || job?.status === "failed") && (
            <div
              className={
                "processing " + (job?.status === "failed" ? "paused" : "")
              }
              role="status"
              aria-live="polite"
            >
              {running ? (
                <LoaderCircle size={21} className="spin" />
              ) : (
                <History size={21} />
              )}
              <div>
                <strong>
                  {running
                    ? job?.stage || "Review in progress"
                    : "Review paused"}
                </strong>
                <p>
                  {running
                    ? "Your current review stays available while the new evidence is assessed."
                    : job?.error || "Your records are saved. Retry the review."}
                </p>
              </div>
              {!running && (
                <button className="button" onClick={retry} disabled={busy}>
                  Retry review
                </button>
              )}
            </div>
          )}
          {newReady && (
            <div className="new-review" role="status" aria-live="polite">
              <div>
                <strong>New review ready</strong>
                <p>
                  See what changed, what stayed the same, and which records
                  matter.
                </p>
              </div>
              <button className="button primary" onClick={viewLatest}>
                Review changes <ArrowRight size={16} />
              </button>
            </div>
          )}
          {revision && (
            <>
              <div className="financial-strip">
                {[
                  {
                    label: "Security deposit",
                    value: revision.financials?.deposit,
                    cite: revision.financials?.depositCitation,
                  },
                  {
                    label: "Claimed deductions",
                    value: revision.findings.length
                      ? revision.findings.reduce((s, f) => s + f.amount, 0)
                      : null,
                    cite: undefined,
                  },
                  {
                    label: "Refund stated in records",
                    value: revision.financials?.refund,
                    cite: revision.financials?.refundCitation,
                  },
                ].map((item) => (
                  <div key={item.label}>
                    <span>{item.label}</span>
                    <strong>
                      {item.value != null
                        ? money(item.value)
                        : "Not established"}
                    </strong>
                    {item.cite && (
                      <button
                        className="inline-button"
                        aria-label={`View source for ${item.label.toLowerCase()}`}
                        aria-haspopup="dialog"
                        onClick={() => selectCitation(item.cite!)}
                      >
                        View source ↗
                      </button>
                    )}
                  </div>
                ))}
              </div>
              <CaseViewTabs
                value={tab}
                onChange={setTab}
                findingCount={revision.findings.length}
                sourceCount={current.sources.length}
                changeCount={revision.changes.length}
                canCompare={revision.number > 1}
              >
                <button
                  className="audit-button"
                  aria-haspopup="dialog"
                  onClick={() => setModal("audit")}
                >
                  {revision.mode === "example"
                    ? "About this example"
                    : "AI processing details"}{" "}
                  <ArrowUpRight size={14} />
                </button>
              </CaseViewTabs>
            </>
          )}
          <div
            id="case-view-panel"
            role={revision ? "tabpanel" : undefined}
            aria-labelledby={revision ? `case-tab-${tab}` : undefined}
            tabIndex={revision ? 0 : undefined}
          >
            {tab === "review" && revision && finding ? (
              <div className="review-layout">
                <aside className="deduction-list" aria-label="Deductions">
                  <div className="eyebrow">DISPUTED CHARGES</div>
                  {revision.findings.map((f, i) => (
                    <button
                      key={f.id}
                      className={finding.id === f.id ? "selected" : ""}
                      aria-pressed={finding.id === f.id}
                      aria-controls="finding-title"
                      onClick={() => {
                        setSelected(f.id);
                        requestAnimationFrame(() =>
                          document.getElementById("finding-title")?.focus(),
                        );
                      }}
                    >
                      <span className="issue-index">
                        {String(i + 1).padStart(2, "0")}
                      </span>
                      <span>
                        <strong>{f.title}</strong>
                        <small>{money(f.amount)} claimed</small>
                      </span>
                      <ChevronRight size={16} />
                    </button>
                  ))}
                  <p className="sidebar-note">
                    <ShieldCheck size={17} />
                    Assessments reflect submitted evidence, not a legal
                    decision.
                  </p>
                </aside>
                <DeductionCard
                  finding={finding}
                  onSelectCitation={selectCitation}
                />
              </div>
            ) : tab === "changes" && revision ? (
              <section className="changes">
                <div className="eyebrow">
                  REVISION {revision.number - 1} → {revision.number}
                </div>
                <h2>A clearer picture of what happened.</h2>
                <p className="muted">
                  Changes to the assessment, with the records that prompted
                  them.
                </p>
                {revision.changes.length ? (
                  revision.changes.map((ch) => (
                    <article className="change" key={ch.findingId}>
                      <div className="section-heading">
                        <h3>{ch.title}</h3>
                        <span className="status status-qualified">
                          {ch.kind}
                        </span>
                      </div>
                      <div className="change-columns">
                        <div>
                          <span className="eyebrow">PREVIOUSLY</span>
                          <p>
                            {ch.before ||
                              "Not included in the previous review."}
                          </p>
                        </div>
                        <div>
                          <span className="eyebrow">NOW</span>
                          <p>{ch.after}</p>
                        </div>
                      </div>
                      <p className="change-reason">{ch.reason}</p>
                      <div className="source-buttons">
                        {ch.sourceIds.map((id) => (
                          <button
                            className="citation"
                            key={id}
                            onClick={() => setInspect({ id })}
                          >
                            {current.sources.find((s) => s.id === id)?.title ||
                              "Source"}{" "}
                            <ArrowUpRight size={13} />
                          </button>
                        ))}
                      </div>
                      {!!ch.unchanged.length && (
                        <div className="unchanged">
                          <Check size={16} />
                          <div>
                            <strong>Preserved findings</strong>
                            {ch.unchanged.map((v, i) => (
                              <p key={i}>{v}</p>
                            ))}
                          </div>
                        </div>
                      )}
                    </article>
                  ))
                ) : (
                  <div className="empty-review">
                    <Check size={28} />
                    <h3>No material changes</h3>
                    <p>The findings remain unchanged in this revision.</p>
                  </div>
                )}
              </section>
            ) : tab === "evidence" || !revision ? (
              <section className="evidence-library">
                <div className="section-heading">
                  <div>
                    <h2>
                      {revision
                        ? "The submitted record"
                        : "Your evidence is saved"}
                    </h2>
                    <p className="muted">
                      {revision
                        ? "Inspect original files and see how each record was read."
                        : "Start a review when the evidence is ready. A failed review never becomes a finding."}
                    </p>
                  </div>
                  {!running && !current.isExample && (
                    <button
                      className="button"
                      disabled={busy || !current.sources.length}
                      onClick={retry}
                    >
                      Review records <ArrowRight size={16} />
                    </button>
                  )}
                </div>
                {current.sources.map((s, i) => (
                  <button
                    className="source-row"
                    aria-haspopup="dialog"
                    key={s.id}
                    onClick={() => setInspect({ id: s.id })}
                  >
                    <span className="source-number">
                      {String(i + 1).padStart(2, "0")}
                    </span>
                    <FileText size={21} />
                    <span className="source-row-main">
                      <strong>{s.title}</strong>
                      <small>
                        {s.extractionMethod || s.kind} · {s.pageCount || "—"}{" "}
                        page(s) · {Math.max(1, Math.round(s.size / 1024))} KB
                      </small>
                      {s.error && (
                        <small className="error-text">{s.error}</small>
                      )}
                    </span>
                    <span className={"source-status " + s.status}>
                      {s.status === "ready" ? "Available" : s.status}
                    </span>
                    <ArrowUpRight size={17} />
                  </button>
                ))}
                {!current.sources.length && (
                  <div className="empty-review">
                    <Upload size={28} />
                    <h3>Add your first record</h3>
                    <button
                      className="button primary"
                      onClick={() => setModal("add")}
                    >
                      Add evidence
                    </button>
                  </div>
                )}
              </section>
            ) : (
              <section className="empty-review">
                <Search size={30} />
                <h2>No itemized deductions identified</h2>
                <p>
                  {revision?.audit?.warnings[0] ||
                    "Add a deduction notice that states what was withheld and why."}
                </p>
                <button className="button" onClick={() => setTab("evidence")}>
                  Inspect submitted records
                </button>
              </section>
            )}
          </div>
        </main>
      )}
      <footer className="app-footer">
        <span>
          TRACE <span className="footer-dot">·</span> Follow the evidence.
        </span>
        <button className="inline-button" onClick={() => setModal("privacy")}>
          Privacy & scope
        </button>
      </footer>
      {modal === "add" && (
        <Modal
          title="Add to the record"
          description="New evidence creates a new review. Previous revisions remain available."
          onClose={() => setModal(null)}
        >
          {error && <ErrorNotice message={error} />}{" "}
          {running ? (
            <div className="empty-review" role="status">
              <LoaderCircle size={28} className="spin" />
              <h3>{job?.stage || "Reviewing new evidence"}</h3>
              <p>You can close this panel. Processing continues.</p>
            </div>
          ) : (
            uploadUI
          )}
        </Modal>
      )}
      {modal === "privacy" && (
        <Modal
          title="Your evidence, handled deliberately."
          description="A focused prototype with clear limits."
          onClose={() => setModal(null)}
        >
          <div className="privacy-copy">
            <h3>What is stored</h3>
            <p>
              Your uploaded files, extracted text, statements, AI requests and
              assessments are stored on this server for 24 hours. A signed
              browser cookie controls access. Clearing cookies loses access to
              your cases.
            </p>
            <h3>What goes to AI</h3>
            <p>
              Live reviews send evidence text to Google Gemini. Images and
              scanned PDFs are sent when transcription or visual reading is
              needed. Provider retention follows your API account terms;
              deleting a case here does not delete provider-side logs.
            </p>
            <h3>Who can access it</h3>
            <p>
              This browser session can access its cases. The server operator can
              access stored data. The prototype does not provide end-to-end
              encryption or user accounts.
            </p>
            <h3>Deletion</h3>
            <p>
              Delete a case to remove its active stored records, originals, and
              jobs. Expired cases are removed automatically. Exported files and
              external backups are outside that deletion.
            </p>
            <h3>Scope</h3>
            <p>
              TRACE organizes evidence and helps prepare questions. It does not
              establish document authenticity, determine liability, provide
              legal advice, or guarantee recovery. AI may be wrong; inspect the
              sources.
            </p>
          </div>
        </Modal>
      )}
      {modal === "delete" && current && (
        <Modal
          title="Delete this case?"
          description="This permanently deletes its records, original files, reviews and jobs from this application."
          onClose={() => setModal(null)}
        >
          <p>
            Export a copy first if you need to retain the review. This cannot be
            undone.
          </p>
          {error && <ErrorNotice message={error} />}
          <div className="dialog-actions">
            <button className="button" onClick={() => setModal(null)}>
              Keep case
            </button>
            <button
              className="button danger"
              disabled={busy}
              onClick={() =>
                action(async () => {
                  await api.deleteCase(current.id);
                  setCurrent(null);
                  setModal(null);
                  setInspect(null);
                  localStorage.removeItem("trace_v2_case");
                  await refreshList();
                  setNotice("Case and its stored evidence deleted.");
                })
              }
            >
              Delete case
            </button>
          </div>
        </Modal>
      )}
      {modal === "audit" && revision && (
        <Modal
          title={
            revision.mode === "example"
              ? "Prepared example"
              : "AI processing details"
          }
          description="Inspect the actual task, evidence input and returned assessment. These are not hidden reasoning traces."
          onClose={() => setModal(null)}
          wide
        >
          {revision.audit ? (
            <>
              <div className="audit-stats">
                <span>{revision.model}</span>
                <span>
                  {Math.round(revision.audit.durationMs / 1000)} seconds
                </span>
                <span>{revision.audit.checkedCitations} citations checked</span>
              </div>
              <p className="muted">
                A separate model check reviewed semantic support before
                publication. These checks reduce errors; they do not guarantee
                correctness.
              </p>
              <details open>
                <summary>Task sent to the AI</summary>
                <pre className="audit-text">{revision.audit.instruction}</pre>
              </details>
              <details>
                <summary>Evidence supplied to the AI</summary>
                <pre className="audit-text">{revision.audit.input}</pre>
              </details>
              <details open>
                <summary>Actual returned assessment</summary>
                <pre className="audit-text">{revision.audit.response}</pre>
              </details>
            </>
          ) : (
            <p>
              This is a synthetic walkthrough with prepared assessments. No AI
              call was made. Start a live case and upload your own test records
              to demonstrate dynamic AI.
            </p>
          )}
        </Modal>
      )}
      {source && inspect && current && (
        <SourceInspector
          source={source}
          citation={inspect.citation}
          caseId={current.id}
          isExample={current.isExample}
          onClose={() => setInspect(null)}
        />
      )}
    </div>
  );
}
