import Modal from "./Modal";

const styles = {
  message: { margin: "0 0 20px", fontSize: 14, color: "#374151", lineHeight: 1.5 },
  actions: { display: "flex", gap: 8, justifyContent: "flex-end" },
  cancelBtn: {
    padding: "8px 16px",
    background: "#f3f4f6",
    border: "none",
    borderRadius: 8,
    cursor: "pointer",
    fontSize: 14,
  },
  confirmBtn: {
    padding: "8px 16px",
    color: "#fff",
    border: "none",
    borderRadius: 8,
    cursor: "pointer",
    fontSize: 14,
    fontWeight: 500,
  },
  confirmBtnDanger: {
    background: "#b91c1c",
  },
  confirmBtnDefault: {
    background: "#1e3a5f",
  },
};

export default function ConfirmModal({
  open,
  title,
  message,
  confirmLabel = "Confirm",
  danger = false,
  onConfirm,
  onCancel,
  isPending = false,
}) {
  return (
    <Modal open={open} onClose={onCancel} title={title}>
      <p style={styles.message}>{message}</p>
      <div style={styles.actions}>
        <button type="button" onClick={onCancel} style={styles.cancelBtn} disabled={isPending}>
          Cancel
        </button>
        <button
          type="button"
          onClick={onConfirm}
          disabled={isPending}
          style={{
            ...styles.confirmBtn,
            ...(danger ? styles.confirmBtnDanger : styles.confirmBtnDefault),
          }}
        >
          {isPending ? "..." : confirmLabel}
        </button>
      </div>
    </Modal>
  );
}
