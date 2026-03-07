const styles = {
  sidebar: {
    width: 260,
    minWidth: 260,
    background: "#fff",
    borderRadius: 12,
    boxShadow: "0 1px 3px rgba(0,0,0,0.08)",
    padding: 16,
    display: "flex",
    flexDirection: "column",
    overflow: "hidden",
  },
  title: {
    margin: "0 0 12px",
    fontSize: 15,
    fontWeight: 600,
    color: "#1e3a5f",
  },
  grid: {
    display: "grid",
    gridTemplateColumns: "repeat(3, 1fr)",
    gap: 10,
    overflow: "auto",
    flex: 1,
    minHeight: 0,
    alignContent: "start",
  },
  thumb: {
    position: "relative",
    aspectRatio: "1",
    borderRadius: 8,
    overflow: "hidden",
    background: "#e5e7eb",
    cursor: "pointer",
    border: "2px solid transparent",
    transition: "border-color 0.15s, box-shadow 0.15s",
  },
  thumbImg: {
    width: "100%",
    height: "100%",
    objectFit: "cover",
    display: "block",
  },
  empty: {
    color: "#6b7280",
    fontSize: 13,
    padding: "24px 0",
    textAlign: "center",
  },
};

const headerStyles = {
  header: { display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 12, gap: 8 },
  title: { margin: 0, fontSize: 15, fontWeight: 600, color: "#1e3a5f" },
  addBtn: {
    padding: "6px 10px",
    fontSize: 12,
    background: "#1e3a5f",
    color: "#fff",
    border: "none",
    borderRadius: 6,
    cursor: "pointer",
    whiteSpace: "nowrap",
  },
  badge: {
    position: "absolute",
    bottom: 4,
    right: 4,
    background: "rgba(0,0,0,0.65)",
    color: "#fff",
    fontSize: 10,
    padding: "2px 5px",
    borderRadius: 4,
  },
};

export default function PhotoLibrarySidebar({ photos, onSelectPhoto, canEdit, onAddPhoto }) {
  if (!photos.length) {
    return (
      <aside style={styles.sidebar}>
        <div style={headerStyles.header}>
          <h2 style={headerStyles.title}>Photos</h2>
          {canEdit && onAddPhoto && (
            <button type="button" onClick={onAddPhoto} style={headerStyles.addBtn}>
              Add photo
            </button>
          )}
        </div>
        <p style={styles.empty}>No photos yet. Add member photos or upload a photo to see them here.</p>
      </aside>
    );
  }

  return (
    <aside style={styles.sidebar}>
      <div style={headerStyles.header}>
        <h2 style={headerStyles.title}>Photos</h2>
        {canEdit && onAddPhoto && (
          <button type="button" onClick={onAddPhoto} style={headerStyles.addBtn}>
            Add photo
          </button>
        )}
      </div>
      <div style={styles.grid}>
        {photos.map((p, i) => (
          <button
            key={p.photoId ?? p.memberId ?? i}
            type="button"
            style={styles.thumb}
            onClick={() => onSelectPhoto?.(i)}
            onMouseEnter={(e) => {
              e.currentTarget.style.borderColor = "#1e3a5f";
              e.currentTarget.style.boxShadow = "0 2px 8px rgba(0,0,0,0.12)";
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.borderColor = "transparent";
              e.currentTarget.style.boxShadow = "none";
            }}
            aria-label={p.name ? `View photo: ${p.name}` : "View photo"}
          >
            <img src={p.url} alt="" style={styles.thumbImg} />
            {p.taggedMembers?.length > 1 && (
              <span style={headerStyles.badge}>{p.taggedMembers.length} people</span>
            )}
          </button>
        ))}
      </div>
    </aside>
  );
}
