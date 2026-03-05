import { useState, useEffect } from "react";
import Modal from "./Modal";

const RELATIONSHIP_TYPES = [
  { value: "parent", label: "Parent–child" },
  { value: "spouse", label: "Spouse" },
  { value: "sibling", label: "Sibling" },
];

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
  radioGroup: { display: "flex", flexDirection: "column", gap: 8 },
  radioRow: { display: "flex", alignItems: "center", gap: 8 },
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

export default function RelationshipTypeModal({
  open,
  sourceName,
  targetName,
  sourceMemberId,
  targetMemberId,
  onConfirm,
  onCancel,
  isPending,
}) {
  const [type, setType] = useState("spouse");
  const [parentIsSource, setParentIsSource] = useState(true);

  useEffect(() => {
    if (open) {
      setType("spouse");
      setParentIsSource(true);
    }
  }, [open]);

  const handleConfirm = () => {
    let memberAId = sourceMemberId;
    let memberBId = targetMemberId;
    if (type === "parent") {
      if (parentIsSource) {
        memberAId = sourceMemberId;
        memberBId = targetMemberId;
      } else {
        memberAId = targetMemberId;
        memberBId = sourceMemberId;
      }
    }
    onConfirm({ memberAId, memberBId, type });
  };

  return (
    <Modal open={open} onClose={onCancel} title="New relationship">
      <div style={styles.form}>
        <p style={{ margin: 0, fontSize: 14, color: "#6b7280" }}>
          Connect <strong>{sourceName || "?"}</strong> and <strong>{targetName || "?"}</strong>
        </p>
        <div style={styles.field}>
          <label style={styles.label}>Relationship type</label>
          <select
            value={type}
            onChange={(e) => setType(e.target.value)}
            style={styles.select}
          >
            {RELATIONSHIP_TYPES.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </select>
        </div>
        {type === "parent" && (
          <div style={styles.field}>
            <label style={styles.label}>Who is the parent?</label>
            <div style={styles.radioGroup}>
              <label style={styles.radioRow}>
                <input
                  type="radio"
                  name="parent"
                  checked={parentIsSource}
                  onChange={() => setParentIsSource(true)}
                />
                <span>{sourceName || "?"} is parent of {targetName || "?"}</span>
              </label>
              <label style={styles.radioRow}>
                <input
                  type="radio"
                  name="parent"
                  checked={!parentIsSource}
                  onChange={() => setParentIsSource(false)}
                />
                <span>{targetName || "?"} is parent of {sourceName || "?"}</span>
              </label>
            </div>
          </div>
        )}
        <div style={styles.actions}>
          <button type="button" onClick={onCancel} style={styles.cancelBtn}>
            Cancel
          </button>
          <button
            type="button"
            onClick={handleConfirm}
            disabled={isPending}
            style={styles.confirmBtn}
          >
            {isPending ? "Adding..." : "Add relationship"}
          </button>
        </div>
      </div>
    </Modal>
  );
}
