import { useEffect } from "react";
import { zIndex } from "../constants/zIndex";

const modalStyles = {
  overlay: {
    position: "fixed",
    inset: 0,
    background: "rgba(0,0,0,0.5)",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    zIndex: zIndex.modal,
    padding: 24,
    overflow: "visible",
  },
  dialog: {
    background: "#fff",
    borderRadius: 12,
    boxShadow: "0 20px 25px -5px rgba(0,0,0,0.1), 0 8px 10px -6px rgba(0,0,0,0.1)",
    maxWidth: 420,
    width: "100%",
    maxHeight: "90vh",
    margin: "auto",
    overflow: "visible",
    display: "flex",
    flexDirection: "column",
  },
  header: {
    flexShrink: 0,
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    padding: "20px 20px 0",
    marginBottom: 4,
  },
  title: { margin: 0, fontSize: 18, fontWeight: 600 },
  closeBtn: {
    background: "none",
    border: "none",
    padding: 4,
    cursor: "pointer",
    fontSize: 20,
    lineHeight: 1,
    color: "#6b7280",
  },
  bodyScroll: {
    flex: 1,
    minHeight: 0,
    overflowY: "auto",
    padding: 20,
  },
  footer: {
    flexShrink: 0,
    padding: "0 20px 20px",
    overflow: "visible",
  },
};

export default function Modal({ open, onClose, title, children, footer, formProps }) {
  useEffect(() => {
    if (!open) return;
    const handleEscape = (e) => e.key === "Escape" && onClose?.();
    document.addEventListener("keydown", handleEscape);
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", handleEscape);
      document.body.style.overflow = "";
    };
  }, [open, onClose]);

  if (!open) return null;

  const content = (
    <>
      <div style={modalStyles.bodyScroll}>{children}</div>
      {footer != null && <div style={modalStyles.footer}>{footer}</div>}
    </>
  );

  return (
    <div
      style={modalStyles.overlay}
      onMouseDown={(e) => e.target === e.currentTarget && onClose?.()}
      role="dialog"
      aria-modal="true"
      aria-labelledby={title ? "modal-title" : undefined}
    >
      <div style={modalStyles.dialog} onClick={(e) => e.stopPropagation()}>
        {(title || onClose) && (
          <div style={modalStyles.header}>
            {title && <h2 id="modal-title" style={modalStyles.title}>{title}</h2>}
            {onClose && (
              <button
                type="button"
                onClick={onClose}
                style={modalStyles.closeBtn}
                aria-label="Close"
              >
                ×
              </button>
            )}
          </div>
        )}
        {formProps != null ? <form {...formProps}>{content}</form> : content}
      </div>
    </div>
  );
}
