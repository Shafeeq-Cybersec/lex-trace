import type { ReactNode } from "react";
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
  return (
    <Dialog.Root open onOpenChange={(open) => !open && onClose()}>
      <Dialog.Portal>
        <Dialog.Overlay className="overlay" />
        <Dialog.Content
          className={
            "dialog " +
            (wide ? "dialog-wide " : "") +
            (side ? "dialog-source" : "")
          }
        >
          <div className="dialog-heading">
            <div>
              <Dialog.Title>{title}</Dialog.Title>
              <Dialog.Description>{description}</Dialog.Description>
            </div>
            <Dialog.Close className="icon-button" aria-label="Close">
              <X size={20} />
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
    <button className="citation" onClick={() => onSelect(citation)}>
      <FileText size={13} />
      <span>
        {citation.label || "View source"} · p. {citation.page}
      </span>
      <ArrowUpRight size={13} />
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
      <AlertCircle size={19} />
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
