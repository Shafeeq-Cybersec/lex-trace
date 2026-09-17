import { useRef, useState, type ReactNode } from "react";
import * as Dialog from "@radix-ui/react-dialog";
import { X, ArrowUpRight, FileText, AlertCircle } from "lucide-react";
import type { Citation } from "../../shared/types.js";
export function Modal({
  title,
  description,
  children,
  onClose,
  wide = false,
  side = false,
}: {
  title: string;
  description: string;
  children: ReactNode;
  onClose: () => void;
  wide?: boolean;
  side?: boolean;
}) {
  // Dialogs are conditionally mounted, without a Radix Trigger. Preserve the
  // actual opener so closing a source returns keyboard users to its citation.
  const [opener] = useState(() => document.activeElement as HTMLElement | null);
  const headingRef = useRef<HTMLHeadingElement>(null);
  return (
    <Dialog.Root open onOpenChange={(open) => !open && onClose()}>
      <Dialog.Portal>
        <Dialog.Overlay className="overlay" />
        <Dialog.Content
          onOpenAutoFocus={(event) => {
            event.preventDefault();
            headingRef.current?.focus();
          }}
          onCloseAutoFocus={(event) => {
            event.preventDefault();
            if (opener?.isConnected && !opener.matches(":disabled")) {
              opener.focus();
            } else {
              document.getElementById("main-content")?.focus();
            }
          }}
          className={
            "dialog " +
            (wide ? "dialog-wide " : "") +
            (side ? "dialog-source" : "")
          }
        >
          <div className="dialog-heading">
            <div>
              <Dialog.Title ref={headingRef} tabIndex={-1}>
                {title}
              </Dialog.Title>
              <Dialog.Description>{description}</Dialog.Description>
            </div>
            <Dialog.Close className="icon-button" aria-label={`Close ${title}`}>
              <X size={20} aria-hidden="true" />
            </Dialog.Close>
          </div>
          <div className="dialog-body">{children}</div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
export function Cite({
  citation,
  onSelect,
}: {
  citation: Citation;
  onSelect: (c: Citation) => void;
}) {
  return (
    <button
      className="citation"
      aria-haspopup="dialog"
      aria-label={`View source citation on page ${citation.page}: ${citation.label || "source document"}`}
      onClick={() => onSelect(citation)}
    >
      <FileText size={13} aria-hidden="true" />
      <span>
        {citation.label || "View source"} · p. {citation.page}
      </span>
      <ArrowUpRight size={13} aria-hidden="true" />
    </button>
  );
}
export function ErrorNotice({
  message,
  onDismiss,
}: {
  message: string;
  onDismiss?: () => void;
}) {
  return (
    <div className="notice notice-error" role="alert">
      <AlertCircle size={19} aria-hidden="true" />
      <div>{message}</div>
      {onDismiss && (
        <button
          className="icon-button"
          aria-label="Dismiss error"
          onClick={onDismiss}
        >
          <X size={17} />
        </button>
      )}
    </div>
  );
}
