import { useState, useEffect, useCallback, useRef } from "react";
import { api } from "../api";

const MIN_SEARCH_LENGTH = 3;
const SEARCH_DEBOUNCE_MS = 200;

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
    flexDirection: "column",
    alignItems: "center",
    width: "100%",
    maxWidth: "90vw",
    maxHeight: "90vh",
  },
  imageWrap: {
    maxWidth: "100%",
    maxHeight: "60vh",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    flexShrink: 0,
  },
  image: {
    maxWidth: "100%",
    maxHeight: "60vh",
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
  footer: {
    width: "100%",
    maxWidth: 560,
    marginTop: 16,
    paddingTop: 12,
    borderTop: "1px solid rgba(255,255,255,0.15)",
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    gap: 12,
    flexShrink: 0,
  },
  footerTopRow: {
    width: "100%",
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    gap: 16,
    minHeight: 20,
  },
  caption: {
    color: "rgba(255,255,255,0.9)",
    fontSize: 14,
    textAlign: "center",
    flex: 1,
    minWidth: 0,
  },
  counter: {
    color: "rgba(255,255,255,0.6)",
    fontSize: 13,
    flexShrink: 0,
  },
  tagsSection: {
    width: "100%",
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    gap: 8,
  },
  tagsLabel: {
    color: "rgba(255,255,255,0.8)",
    fontSize: 12,
    alignSelf: "flex-start",
    marginBottom: 0,
  },
  tagChips: {
    display: "flex",
    flexWrap: "wrap",
    justifyContent: "center",
    gap: 8,
    rowGap: 8,
    width: "100%",
  },
  tagChip: {
    display: "inline-flex",
    alignItems: "center",
    gap: 6,
    padding: "6px 12px",
    background: "rgba(255,255,255,0.2)",
    borderRadius: 16,
    color: "#fff",
    fontSize: 13,
    lineHeight: 1.2,
    whiteSpace: "nowrap",
  },
  tagRemove: {
    background: "none",
    border: "none",
    color: "rgba(255,255,255,0.9)",
    cursor: "pointer",
    padding: 0,
    fontSize: 16,
    lineHeight: 1,
  },
  addTagRow: {
    display: "flex",
    alignItems: "center",
    gap: 8,
    width: "100%",
    maxWidth: 320,
  },
  addTagInput: {
    flex: 1,
    padding: "8px 12px",
    borderRadius: 8,
    border: "1px solid rgba(255,255,255,0.4)",
    background: "rgba(0,0,0,0.3)",
    color: "#fff",
    fontSize: 13,
    minWidth: 0,
  },
  addTagBtn: {
    padding: "8px 16px",
    borderRadius: 8,
    border: "none",
    background: "rgba(255,255,255,0.25)",
    color: "#fff",
    fontSize: 13,
    cursor: "pointer",
    flexShrink: 0,
  },
  searchResults: {
    width: "100%",
    maxWidth: 320,
    maxHeight: 160,
    overflowY: "auto",
    background: "rgba(0,0,0,0.5)",
    borderRadius: 8,
    border: "1px solid rgba(255,255,255,0.2)",
    marginTop: -4,
  },
  searchResultItem: {
    padding: "10px 12px",
    color: "#fff",
    fontSize: 13,
    cursor: "pointer",
    borderBottom: "1px solid rgba(255,255,255,0.08)",
  },
  searchResultItemLast: { borderBottom: "none" },
};

export default function PhotoViewerModal({
  open,
  photos,
  currentIndex = 0,
  onIndexChange,
  onClose,
  canEdit,
  treeId,
  onTagsUpdated,
}) {
  const index = Math.min(Math.max(0, currentIndex), Math.max(0, photos.length - 1));
  const photo = photos[index] ?? null;
  const [tagLoading, setTagLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState([]);
  const [searchLoading, setSearchLoading] = useState(false);
  const searchDebounceRef = useRef(null);
  const taggedIds = new Set((photo?.taggedMembers ?? []).map((m) => m.id));
  const isTreePhoto = photo?.source === "photo" && photo?.photoId;

  useEffect(() => {
    if (!treeId || searchQuery.trim().length < MIN_SEARCH_LENGTH) {
      setSearchResults([]);
      return;
    }
    if (searchDebounceRef.current) clearTimeout(searchDebounceRef.current);
    searchDebounceRef.current = setTimeout(() => {
      setSearchLoading(true);
      api
        .get(`/trees/${treeId}/members/search`, { params: { q: searchQuery.trim() } })
        .then((res) => {
          setSearchResults(res.data?.members ?? []);
        })
        .catch(() => setSearchResults([]))
        .finally(() => setSearchLoading(false));
    }, SEARCH_DEBOUNCE_MS);
    return () => {
      if (searchDebounceRef.current) clearTimeout(searchDebounceRef.current);
    };
  }, [treeId, searchQuery]);

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

  const handleAddTag = useCallback(
    async (memberId) => {
      if (!memberId || !treeId || !photo?.photoId || !onTagsUpdated) return;
      setTagLoading(true);
      try {
        await api.post(`/trees/${treeId}/photos/${photo.photoId}/tags`, { memberId });
        onTagsUpdated();
        setSearchQuery("");
        setSearchResults([]);
      } finally {
        setTagLoading(false);
      }
    },
    [treeId, photo?.photoId, onTagsUpdated]
  );

  const handleRemoveTag = useCallback(
    async (memberId) => {
      if (!treeId || !photo?.photoId || !onTagsUpdated) return;
      setTagLoading(true);
      try {
        await api.delete(`/trees/${treeId}/photos/${photo.photoId}/tags/${memberId}`);
        onTagsUpdated();
      } finally {
        setTagLoading(false);
      }
    },
    [treeId, photo?.photoId, onTagsUpdated]
  );

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

        {photo && (
          <div style={styles.footer}>
            <div style={styles.footerTopRow}>
              {photo.name && <div style={styles.caption}>{photo.name}</div>}
              {photos.length > 1 && (
                <div style={styles.counter}>
                  {index + 1} / {photos.length}
                </div>
              )}
            </div>

            {(photo?.taggedMembers?.length > 0 || (canEdit && isTreePhoto)) && (
              <div style={styles.tagsSection}>
                <div style={styles.tagsLabel}>
                  {photo?.taggedMembers?.length ? "Tagged" : "Tag members in this photo"}
                </div>
                <div style={styles.tagChips}>
                  {(photo?.taggedMembers ?? []).map((m) => (
                    <span key={m.id} style={styles.tagChip}>
                      {m.name}
                      {canEdit && isTreePhoto && (
                        <button
                          type="button"
                          style={styles.tagRemove}
                          onClick={() => handleRemoveTag(m.id)}
                          disabled={tagLoading}
                          aria-label={`Remove ${m.name} from photo`}
                        >
                          ×
                        </button>
                      )}
                    </span>
                  ))}
                </div>
                {canEdit && isTreePhoto && (
                  <>
                    <div style={styles.addTagRow}>
                      <input
                        type="text"
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        placeholder="Search members (min 3 characters)…"
                        style={styles.addTagInput}
                        disabled={tagLoading}
                        aria-label="Search members to add to photo"
                        autoComplete="off"
                      />
                    </div>
                    {searchQuery.trim().length >= MIN_SEARCH_LENGTH && (
                      <div style={styles.searchResults}>
                        {searchLoading ? (
                          <div style={{ ...styles.searchResultItem, ...styles.searchResultItemLast }}>
                            Searching…
                          </div>
                        ) : (
                          (() => {
                            const available = searchResults.filter((m) => !taggedIds.has(m.id));
                            if (available.length === 0) {
                              return (
                                <div style={{ ...styles.searchResultItem, ...styles.searchResultItemLast }}>
                                  {searchResults.length === 0 ? "No members found" : "All matching members are already tagged"}
                                </div>
                              );
                            }
                            return available.map((m, i, arr) => (
                              <button
                                key={m.id}
                                type="button"
                                style={{
                                  ...styles.searchResultItem,
                                  ...(i === arr.length - 1 ? styles.searchResultItemLast : {}),
                                }}
                                onClick={() => handleAddTag(m.id)}
                                disabled={tagLoading}
                              >
                                {m.name}
                              </button>
                            ));
                          })()
                        )}
                      </div>
                    )}
                  </>
                )}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
