import { useEffect, useState } from "react";
import type { Citation, Source } from "../../shared/types.js";
import { Modal, ErrorNotice } from "./UI.js";
export function SourceInspector({
  source,
  citation,
  caseId,
  onClose,
  isExample,
}: {
  source: Source;
  citation?: Citation;
  caseId: string;
  onClose: () => void;
  isExample: boolean;
}) {
  const [page, setPage] = useState(citation?.page || 1);
  const [failed, setFailed] = useState(false);
  useEffect(() => {
    setPage(citation?.page || 1);
    setFailed(false);
  }, [source.id, citation?.page]);
  const url = "/api/case/" + caseId + "/sources/" + source.id + "/file";
  const text =
    source.pages[page - 1] || "No extracted text is available for this page.";
  const quote = citation?.quote;
  const index = quote && page === citation?.page ? text.indexOf(quote) : -1;
  return (
    <Modal
      title={source.title}
      description={
        isExample
          ? "Synthetic example record · reconstructed text, not an original document"
          : source.description || "Original submitted evidence"
      }
      onClose={onClose}
      side
    >
      <div className="source-meta">
        <span>
          {source.extractionMethod === "user"
            ? "User-provided statement"
            : source.extractionMethod === "observation"
              ? "AI observation"
              : source.extractionMethod === "transcription"
                ? "AI transcription"
                : "Native text"}
        </span>
        <span>{source.pageCount || source.pages.length} page(s)</span>
      </div>
      {citation && (
        <div className="quoted">
          <span className="eyebrow">CITED EXCERPT · PAGE {citation.page}</span>
          <p>“{citation.quote}”</p>
          <small>
            Location checked against extracted text. This does not authenticate
            the document or prove the claim.
          </small>
        </div>
      )}
      {source.status === "unreadable" && (
        <ErrorNotice
          message={source.error || "This record could not be read."}
        />
      )}
      {source.pages.length > 1 && (
        <label className="field">
          Page
          <select
            value={page}
            onChange={(e) => setPage(Number(e.target.value))}
          >
            {source.pages.map((_, i) => (
              <option value={i + 1} key={i}>
                Page {i + 1}
              </option>
            ))}
          </select>
        </label>
      )}
      <p className="sr-only" role="status" aria-atomic="true">
        Showing page {page} of{" "}
        {Math.max(1, source.pageCount || source.pages.length)}.
      </p>
      <section
        className="source-transcript"
        aria-labelledby="source-text-heading"
      >
        <h3 id="source-text-heading">
          {isExample
            ? "Example record text"
            : source.extractionMethod === "observation"
              ? "Visual observation / readable text"
              : "Accessible text"}
        </h3>
        {source.extractionMethod === "observation" ||
        source.extractionMethod === "transcription" ? (
          <p className="muted">
            AI-derived text can omit or misread details. Compare it with the
            original below.
          </p>
        ) : null}
        <pre tabIndex={0} aria-label={`Record text, page ${page}`}>
          {index >= 0 && quote ? (
            <>
              {text.slice(0, index)}
              <mark>
                <span className="sr-only">Cited excerpt begins. </span>
                {quote}
                <span className="sr-only"> Cited excerpt ends.</span>
              </mark>
              {text.slice(index + quote.length)}
            </>
          ) : (
            text
          )}
        </pre>
      </section>
      {!isExample && (
        <div className="original">
          {source.kind === "image" ? (
            <img
              src={url}
              alt={
                "Original submitted image: " +
                source.title +
                ". An AI-generated description is available in the record text above."
              }
              onError={() => setFailed(true)}
            />
          ) : source.kind === "pdf" ? (
            <details className="original-preview">
              <summary>View original PDF preview</summary>
              <object
                key={source.id + page}
                data={url + "#page=" + page}
                type="application/pdf"
                aria-label={"Original PDF, page " + page}
                title={source.title + ", original PDF, page " + page}
              >
                <p>
                  The PDF preview is unavailable.{" "}
                  <a
                    href={url + "#page=" + page}
                    target="_blank"
                    rel="noreferrer"
                  >
                    Open the original PDF in a new tab
                  </a>
                </p>
              </object>
            </details>
          ) : null}
          {failed && (
            <ErrorNotice message="The original preview could not load. Retry or open the original file." />
          )}
          <a
            className="text-link"
            href={url + "#page=" + page}
            target="_blank"
            rel="noreferrer"
          >
            Open original in a new tab ↗
          </a>
        </div>
      )}
      <details>
        <summary>File details</summary>
        <dl className="file-details">
          <dt>Filename</dt>
          <dd>{source.filename}</dd>
          <dt>SHA-256 {isExample ? "(example identifier)" : ""}</dt>
          <dd>{source.hash}</dd>
          <dt>Evidence limitation</dt>
          <dd>
            Submitted records may be incomplete or one-sided. Image dates,
            scale, authenticity and cause are not established by appearance.
          </dd>
        </dl>
      </details>
    </Modal>
  );
}
