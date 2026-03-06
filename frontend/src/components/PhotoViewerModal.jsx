import { useEffect, useCallback } from "react";

const styles = {
  overlay: {
    position: "fixed",
    inset: 0,
    background: "rgba(0,0,0,0.9)",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    zIndex: 1200,
    padding: 48,
  },
  container: {
    position: "relative",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    width: "100%",
    maxWidth: "90vw",
    maxHeight: "90vh",
  },
  imageWrap: {
    maxWidth: "100%",
    maxHeight: "85vh",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
  },
  image: {
    maxWidth: "100%",
    maxHeight: "85vh",
    objectFit: "contain",
    borderRadius: 8,
  },
  navBtn: {
    position: "absolute",
    top: "50%",
    transform: "translateY(-50%)",
    background: "rgba(255,255,255,0.15)",
    border: "none",
    color: "#fff",
    width: 48,
    height: 48,
    borderRadius: "50%",
    cursor: "pointer",
    fontSize: 24,
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    transition: "background 0.2s",
  },
  navBtnLeft: { left: 16 },
  navBtnRight: { right: 16 },
  closeBtn: {
    position: "absolute",
    top: -40,
    right: 0,
    background: "none",
    border: "none",
    color: "rgba(255,255,255,0.8)",
    padding: 8,
    cursor: "pointer",
    fontSize: 28,
    lineHeight: 1,
  },
  caption: {
    position: "absolute",
    bottom: -36,
    left: 0,
    right: 0,
    textAlign: "center",
    color: "rgba(255,255,255,0.9)",
    fontSize: 14,
  },
  counter: {
    position: "absolute",
    bottom: -36,
    right: 0,
    color: "rgba(255,255,255,0.6)",
    fontSize: 13,
  },
};

export default function PhotoViewerModal({ open, photos, currentIndex = 0, onIndexChange, onClose }) {
  const index = Math.min(Math.max(0, currentIndex), Math.max(0, photos.length - 1));
  const photo = photos[index] ?? null;

  const goPrev = useCallback(() => {
    if (photos.length <= 1) return;
    const prev = index <= 0 ? photos.length - 1 : index - 1;
    onIndexChange?.(prev);
  }, [index, photos.length, onIndexChange]);

  const goNext = useCallback(() => {
    if (photos.length <= 1) return;
    const next = index >= photos.length - 1 ? 0 : index + 1;
    onIndexChange?.(next);
  }, [index, photos.length, onIndexChange]);

  useEffect(() => {
    if (!open) return;
    const handleKey = (e) => {
      if (e.key === "Escape") onClose?.();
      if (e.key === "ArrowLeft") goPrev();
      if (e.key === "ArrowRight") goNext();
    };
    document.addEventListener("keydown", handleKey);
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", handleKey);
      document.body.style.overflow = "";
    };
  }, [open, onClose, goPrev, goNext]);

  if (!open) return null;

  return (
    <div
      style={styles.overlay}
      onClick={(e) => e.target === e.currentTarget && onClose?.()}
      role="dialog"
      aria-modal="true"
      aria-label="Photo viewer"
    >
      <div style={styles.container} onClick={(e) => e.stopPropagation()}>
        <button
          type="button"
          onClick={onClose}
          style={styles.closeBtn}
          aria-label="Close"
        >
          ×
        </button>

        {photos.length > 1 && (
          <button
            type="button"
            onClick={goPrev}
            style={{ ...styles.navBtn, ...styles.navBtnLeft }}
            aria-label="Previous photo"
          >
            ‹
          </button>
        )}

        <div style={styles.imageWrap}>
          {photo ? (
            <img
              src={photo.url}
              alt={photo.name ? `Photo of ${photo.name}` : "Family photo"}
              style={styles.image}
            />
          ) : (
            <span style={{ color: "#fff" }}>No photo</span>
          )}
        </div>

        {photos.length > 1 && (
          <button
            type="button"
            onClick={goNext}
            style={{ ...styles.navBtn, ...styles.navBtnRight }}
            aria-label="Next photo"
          >
            ›
          </button>
        )}

        {photo?.name && (
          <div style={styles.caption}>{photo.name}</div>
        )}
        {photos.length > 1 && (
          <div style={styles.counter}>
            {index + 1} / {photos.length}
          </div>
        )}
      </div>
    </div>
  );
}
