import { useEffect } from "react";

const modalStyles = {
  overlay: {
    position: "fixed",
    inset: 0,
    background: "rgba(0,0,0,0.5)",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    zIndex: 1000,
    padding: 24,
  },
  dialog: {
    background: "#fff",
    borderRadius: 12,
    boxShadow: "0 20px 25px -5px rgba(0,0,0,0.1), 0 8px 10px -6px rgba(0,0,0,0.1)",
    maxWidth: 420,
    width: "100%",
    maxHeight: "90vh",
    overflow: "auto",
  },
  header: {
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
  body: { padding: 20 },
};

export default function Modal({ open, onClose, title, children }) {
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

  return (
    <div
      style={modalStyles.overlay}
      onClick={(e) => e.target === e.currentTarget && onClose?.()}
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
        <div style={modalStyles.body}>{children}</div>
      </div>
    </div>
  );
}
