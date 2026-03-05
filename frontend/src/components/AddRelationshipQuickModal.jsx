import { useState, useEffect } from "react";
import Modal from "./Modal";

const styles = {
  form: { display: "flex", flexDirection: "column", gap: 16 },
  field: { display: "flex", flexDirection: "column", gap: 6 },
  label: { fontSize: 14, fontWeight: 500, color: "#374151" },
  select: {
    padding: "10px 12px",
    border: "1px solid #d1d5db",
    borderRadius: 8,
    fontSize: 14,
  },
  actions: { display: "flex", gap: 8, justifyContent: "flex-end", marginTop: 8 },
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
    background: "#1e3a5f",
    color: "#fff",
    border: "none",
    borderRadius: 8,
    cursor: "pointer",
    fontSize: 14,
    fontWeight: 500,
  },
};

export default function AddRelationshipQuickModal({
  open,
  mode,
  currentMemberName,
  members,
  currentMemberId,
  onConfirm,
  onCancel,
  isPending,
}) {
  const [otherId, setOtherId] = useState("");

  const others = members.filter((m) => m.id !== currentMemberId);
  const title = mode === "child" ? "Add child" : "Add spouse";

  useEffect(() => {
    if (open) setOtherId("");
  }, [open]);

  const handleSubmit = (e) => {
    e?.preventDefault?.();
    if (!otherId) return;
    if (mode === "child") {
      onConfirm({ memberAId: currentMemberId, memberBId: otherId, type: "parent" });
    } else {
      onConfirm({ memberAId: currentMemberId, memberBId: otherId, type: "spouse" });
    }
  };

  return (
    <Modal open={open} onClose={onCancel} title={title}>
      <form onSubmit={handleSubmit} style={styles.form}>
        <p style={{ margin: 0, fontSize: 14, color: "#6b7280" }}>
          {mode === "child" ? (
            <>Add a child for <strong>{currentMemberName || "?"}</strong></>
          ) : (
            <>Add a spouse for <strong>{currentMemberName || "?"}</strong></>
          )}
        </p>
        <div style={styles.field}>
          <label style={styles.label}>Select person</label>
          <select
            value={otherId}
            onChange={(e) => setOtherId(e.target.value)}
            style={styles.select}
            required
          >
            <option value="">Choose...</option>
            {others.map((m) => (
              <option key={m.id} value={m.id}>{m.name}</option>
            ))}
          </select>
        </div>
        <div style={styles.actions}>
          <button type="button" onClick={onCancel} style={styles.cancelBtn}>
            Cancel
          </button>
          <button type="submit" disabled={isPending || !otherId} style={styles.confirmBtn}>
            {isPending ? "Adding..." : "Add"}
          </button>
        </div>
      </form>
    </Modal>
  );
}
