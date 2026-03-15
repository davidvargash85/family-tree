import Modal from "./Modal";
import { Button } from "./ui";

const styles = {
  message: { margin: "0 0 20px", fontSize: 14, color: "#374151", lineHeight: 1.5 },
  actions: { display: "flex", gap: 8, justifyContent: "flex-end" },
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
        <Button type="button" variant="ghost" onClick={onCancel} disabled={isPending}>
          Cancel
        </Button>
        <Button
          type="button"
          variant={danger ? "danger" : "primary"}
          onClick={onConfirm}
          disabled={isPending}
          loading={isPending}
          loadingLabel={confirmLabel}
        >
          {confirmLabel}
        </Button>
      </div>
    </Modal>
  );
}
