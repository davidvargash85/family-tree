import { useRef } from "react";
import Modal from "./Modal";

const styles = {
  form: { display: "flex", flexDirection: "column", gap: 16 },
  field: { display: "flex", flexDirection: "column", gap: 4 },
  label: { fontSize: 14, fontWeight: 500, color: "#374151" },
  input: {
    padding: "10px 12px",
    border: "1px solid #d1d5db",
    borderRadius: 8,
    fontSize: 14,
  },
  fileInput: { fontSize: 14 },
  actions: { display: "flex", gap: 8, justifyContent: "flex-end", marginTop: 8 },
  cancelBtn: {
    padding: "8px 16px",
    background: "#f3f4f6",
    border: "none",
    borderRadius: 8,
    cursor: "pointer",
    fontSize: 14,
  },
  submitBtn: {
    padding: "8px 16px",
    background: "#1e3a5f",
    color: "#fff",
    border: "none",
    borderRadius: 8,
    cursor: "pointer",
    fontSize: 14,
    fontWeight: 500,
  },
  error: { fontSize: 12, color: "#dc2626" },
};

export default function AddPhotoModal({ open, onClose, onSubmit, isPending, treeId }) {
  const fileRef = useRef(null);
  const captionRef = useRef(null);

  const handleSubmit = (e) => {
    e.preventDefault();
    const file = fileRef.current?.files?.[0];
    if (!file) return;
    const formData = new FormData();
    formData.append("photo", file);
    const caption = captionRef.current?.value?.trim();
    if (caption) formData.append("caption", caption);
    onSubmit(formData);
    fileRef.current.value = "";
    if (captionRef.current) captionRef.current.value = "";
  };

  if (!open) return null;

  return (
    <Modal open={open} onClose={onClose} title="Add photo">
      <form onSubmit={handleSubmit} style={styles.form}>
        <div style={styles.field}>
          <label style={styles.label} htmlFor="add-photo-file">
            Photo *
          </label>
          <input
            ref={fileRef}
            id="add-photo-file"
            type="file"
            accept="image/jpeg,image/png,image/gif,image/webp"
            style={{ ...styles.input, ...styles.fileInput }}
            required
          />
        </div>
        <div style={styles.field}>
          <label style={styles.label} htmlFor="add-photo-caption">
            Caption (optional)
          </label>
          <input
            ref={captionRef}
            id="add-photo-caption"
            type="text"
            placeholder="e.g. Family reunion 2020"
            style={styles.input}
            maxLength={200}
          />
        </div>
        <div style={styles.actions}>
          <button type="button" onClick={onClose} style={styles.cancelBtn}>
            Cancel
          </button>
          <button type="submit" style={styles.submitBtn} disabled={isPending}>
            {isPending ? "Uploading…" : "Upload"}
          </button>
        </div>
      </form>
    </Modal>
  );
}
