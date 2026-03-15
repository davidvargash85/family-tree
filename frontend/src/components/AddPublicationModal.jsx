import { useRef, useState } from "react";
import Modal from "./Modal";
import { Button } from "./ui";

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
  textarea: {
    padding: "10px 12px",
    border: "1px solid #d1d5db",
    borderRadius: 8,
    fontSize: 14,
    minHeight: 100,
    resize: "vertical",
  },
  fileInput: { fontSize: 14 },
  tagGrid: {
    display: "flex",
    flexWrap: "wrap",
    gap: 8,
    maxHeight: 120,
    overflow: "auto",
  },
  tagChip: {
    display: "inline-flex",
    alignItems: "center",
    gap: 4,
    padding: "4px 8px",
    background: "#e0e7ff",
    color: "#3730a3",
    borderRadius: 20,
    fontSize: 12,
  },
  tagRemove: { background: "none", border: "none", cursor: "pointer", padding: 0, fontSize: 14, lineHeight: 1 },
  memberOption: {
    padding: "6px 10px",
    cursor: "pointer",
    borderRadius: 6,
    fontSize: 14,
  },
  memberOptionSelected: { background: "#e0e7ff" },
  actions: { display: "flex", gap: 8, justifyContent: "flex-end", marginTop: 8 },
  error: { fontSize: 12, color: "#dc2626" },
  preview: { maxWidth: "100%", maxHeight: 200, borderRadius: 8, objectFit: "contain" },
};

export default function AddPublicationModal({
  open,
  onClose,
  onSubmit,
  isPending,
  treeId,
  members = [],
}) {
  const contentRef = useRef(null);
  const fileRef = useRef(null);
  const [tagIds, setTagIds] = useState([]);
  const [photoPreview, setPhotoPreview] = useState(null);

  const toggleMember = (id) => {
    setTagIds((prev) =>
      prev.includes(id) ? prev.filter((m) => m !== id) : [...prev, id]
    );
  };

  const handleFileChange = () => {
    const file = fileRef.current?.files?.[0];
    if (!file) {
      setPhotoPreview(null);
      return;
    }
    const url = URL.createObjectURL(file);
    setPhotoPreview(url);
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    const content = contentRef.current?.value?.trim() || "";
    const file = fileRef.current?.files?.[0];
    if (!content && !file) return;
    const formData = new FormData();
    if (content) formData.append("content", content);
    if (file) formData.append("photo", file);
    if (tagIds.length) formData.append("tagIds", tagIds.join(","));
    onSubmit(formData);
    contentRef.current.value = "";
    fileRef.current.value = "";
    setTagIds([]);
    setPhotoPreview(null);
  };

  const handleClose = () => {
    setTagIds([]);
    setPhotoPreview(null);
    if (fileRef.current) fileRef.current.value = "";
    if (contentRef.current) contentRef.current.value = "";
    onClose();
  };

  if (!open) return null;

  return (
    <Modal open={open} onClose={handleClose} title="Add to timeline">
      <form onSubmit={handleSubmit} style={styles.form}>
        <div style={styles.field}>
          <label style={styles.label} htmlFor="pub-content">
            What's on your mind?
          </label>
          <textarea
            ref={contentRef}
            id="pub-content"
            placeholder="Write something…"
            style={styles.textarea}
            maxLength={2000}
          />
        </div>
        <div style={styles.field}>
          <label style={styles.label} htmlFor="pub-photo">
            Photo (optional)
          </label>
          <input
            ref={fileRef}
            id="pub-photo"
            type="file"
            accept="image/jpeg,image/png,image/gif,image/webp"
            style={{ ...styles.input, ...styles.fileInput }}
            onChange={handleFileChange}
          />
          {photoPreview && (
            <img src={photoPreview} alt="" style={styles.preview} />
          )}
        </div>
        <div style={styles.field}>
          <label style={styles.label}>Tag people (optional)</label>
          <div style={styles.tagGrid}>
            {members.map((m) => (
              <button
                key={m.id}
                type="button"
                style={{
                  ...styles.memberOption,
                  ...(tagIds.includes(m.id) ? styles.memberOptionSelected : {}),
                }}
                onClick={() => toggleMember(m.id)}
              >
                {m.name}
              </button>
            ))}
          </div>
          {tagIds.length > 0 && (
            <div style={{ marginTop: 8, display: "flex", flexWrap: "wrap", gap: 6 }}>
              {tagIds.map((id) => {
                const member = members.find((m) => m.id === id);
                return member ? (
                  <span key={id} style={styles.tagChip}>
                    {member.name}
                    <button
                      type="button"
                      style={styles.tagRemove}
                      onClick={() => toggleMember(id)}
                      aria-label={`Remove ${member.name}`}
                    >
                      ×
                    </button>
                  </span>
                ) : null;
              })}
            </div>
          )}
        </div>
        <div style={styles.actions}>
          <Button type="button" variant="ghost" onClick={handleClose}>
            Cancel
          </Button>
          <Button type="submit" variant="primary" disabled={isPending} loading={isPending} loadingLabel="Posting…">
            Post
          </Button>
        </div>
      </form>
    </Modal>
  );
}
