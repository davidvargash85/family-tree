import { useState } from "react";
import { useParams, Link } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "../api";
import AddPublicationModal from "../components/AddPublicationModal";
import ConfirmModal from "../components/ConfirmModal";

const formatDate = (dateStr) => {
  const d = new Date(dateStr);
  const now = new Date();
  const diffMs = now - d;
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMs / 3600000);
  const diffDays = Math.floor(diffMs / 86400000);
  if (diffMins < 1) return "Just now";
  if (diffMins < 60) return `${diffMins}m ago`;
  if (diffHours < 24) return `${diffHours}h ago`;
  if (diffDays < 7) return `${diffDays}d ago`;
  return d.toLocaleDateString(undefined, { dateStyle: "medium" });
};

export default function TimelinePage() {
  const { treeId } = useParams();
  const queryClient = useQueryClient();
  const [showAddPublication, setShowAddPublication] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState(null);

  const { data: treeData } = useQuery({
    queryKey: ["tree", treeId],
    queryFn: async () => {
      const { data } = await api.get(`/trees/${treeId}`);
      return data;
    },
  });

  const { data: membersData } = useQuery({
    queryKey: ["members", treeId],
    queryFn: async () => {
      const { data } = await api.get(`/trees/${treeId}/members`);
      return data;
    },
    enabled: !!treeId,
  });

  const { data: publicationsData, isLoading: pubsLoading } = useQuery({
    queryKey: ["publications", treeId],
    queryFn: async () => {
      const { data } = await api.get(`/trees/${treeId}/publications`);
      return data;
    },
    enabled: !!treeId,
  });

  const createPublication = useMutation({
    mutationFn: (formData) => api.post(`/trees/${treeId}/publications`, formData),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["publications", treeId] });
      queryClient.invalidateQueries({ queryKey: ["treePhotos", treeId] });
      setShowAddPublication(false);
    },
  });

  const deletePublication = useMutation({
    mutationFn: (id) => api.delete(`/trees/${treeId}/publications/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["publications", treeId] });
      queryClient.invalidateQueries({ queryKey: ["treePhotos", treeId] });
      setDeleteTarget(null);
    },
  });

  const tree = treeData?.tree;
  const members = membersData?.members ?? [];
  const publications = publicationsData?.publications ?? [];
  const canEdit = tree && (tree.role === "owner" || tree.role === "editor");

  if (!tree && treeData !== undefined) {
    return (
      <div style={styles.page}>
        <p style={styles.muted}>Tree not found.</p>
      </div>
    );
  }

  if (!tree) {
    return (
      <div style={styles.page}>
        <p style={styles.muted}>Loading…</p>
      </div>
    );
  }

  return (
    <div style={styles.page}>
      <header style={styles.header}>
        <Link to="/" style={styles.backLink}>
          ← Dashboard
        </Link>
        <h1 style={styles.title}>{tree.name}</h1>
        <span style={styles.badge}>{tree.role}</span>
        <Link to={`/tree/${treeId}`} style={styles.navLink}>
          Tree
        </Link>
        {tree.role === "owner" && (
          <Link to={`/tree/${treeId}/settings`} style={styles.navLink}>
            Settings
          </Link>
        )}
      </header>

      <div style={styles.main}>
        <div style={styles.feed}>
          {canEdit && (
            <section style={styles.composerCard}>
              <button
                type="button"
                style={styles.composerTrigger}
                onClick={() => setShowAddPublication(true)}
              >
                What would you like to share?
              </button>
            </section>
          )}

          {pubsLoading ? (
            <p style={styles.muted}>Loading timeline…</p>
          ) : publications.length === 0 ? (
            <section style={styles.emptyCard}>
              <p style={styles.emptyText}>
                No posts yet.
                {canEdit && " Add a photo or some words to start the timeline."}
              </p>
            </section>
          ) : (
            publications.map((pub) => (
              <article key={pub.id} style={styles.card}>
                <div style={styles.cardMeta}>
                  <span style={styles.cardTime}>{formatDate(pub.createdAt)}</span>
                  {canEdit && (
                    <button
                      type="button"
                      style={styles.deleteBtn}
                      onClick={() => setDeleteTarget({ id: pub.id })}
                      aria-label="Delete post"
                    >
                      Delete
                    </button>
                  )}
                </div>
                {pub.photo && (
                  <div style={styles.cardPhotoWrap}>
                    <img
                      src={pub.photo.filePath}
                      alt=""
                      style={styles.cardPhoto}
                    />
                  </div>
                )}
                {pub.content && (
                  <p style={styles.cardContent}>{pub.content}</p>
                )}
                {pub.tags?.length > 0 && (
                  <p style={styles.cardTags}>
                    With{" "}
                    {pub.tags.map((t) => t.member?.name).filter(Boolean).join(", ")}
                  </p>
                )}
              </article>
            ))
          )}
        </div>
      </div>

      {canEdit && (
        <AddPublicationModal
          open={showAddPublication}
          onClose={() => setShowAddPublication(false)}
          onSubmit={(formData) => createPublication.mutate(formData)}
          isPending={createPublication.isPending}
          treeId={treeId}
          members={members}
        />
      )}

      {deleteTarget && (
        <ConfirmModal
          open
          title="Delete post?"
          message="This will remove the post from the timeline. If it had a photo, the photo will also be removed from the tree gallery."
          confirmLabel="Delete"
          danger
          onConfirm={() => deletePublication.mutate(deleteTarget.id)}
          onCancel={() => setDeleteTarget(null)}
          isPending={deletePublication.isPending}
        />
      )}
    </div>
  );
}

const styles = {
  page: {
    minHeight: "100vh",
    background: "#f5f2eb",
    display: "flex",
    flexDirection: "column",
  },
  header: {
    background: "#fff",
    padding: "16px 24px",
    boxShadow: "0 1px 3px rgba(0,0,0,0.08)",
    display: "flex",
    alignItems: "center",
    gap: 16,
    flexWrap: "wrap",
  },
  backLink: { color: "#2563eb", fontSize: 14, textDecoration: "none" },
  title: { margin: 0, fontSize: 20, fontWeight: 600, flex: 1 },
  badge: {
    background: "#e0e7ff",
    color: "#3730a3",
    padding: "4px 10px",
    borderRadius: 20,
    fontSize: 12,
    fontWeight: 600,
  },
  navLink: { fontSize: 14, color: "#2563eb", textDecoration: "none" },
  main: {
    flex: 1,
    padding: 24,
    maxWidth: 640,
    margin: "0 auto",
    width: "100%",
  },
  feed: { display: "flex", flexDirection: "column", gap: 16 },
  composerCard: {
    background: "#fff",
    borderRadius: 12,
    padding: 16,
    boxShadow: "0 1px 3px rgba(0,0,0,0.08)",
  },
  composerTrigger: {
    width: "100%",
    padding: "14px 16px",
    textAlign: "left",
    border: "1px dashed #d1d5db",
    borderRadius: 8,
    background: "#fafafa",
    color: "#6b7280",
    fontSize: 15,
    cursor: "pointer",
  },
  emptyCard: {
    background: "#fff",
    borderRadius: 12,
    padding: 32,
    boxShadow: "0 1px 3px rgba(0,0,0,0.08)",
    textAlign: "center",
  },
  emptyText: { margin: 0, color: "#6b7280", fontSize: 15 },
  card: {
    background: "#fff",
    borderRadius: 12,
    overflow: "hidden",
    boxShadow: "0 1px 3px rgba(0,0,0,0.08)",
  },
  cardMeta: {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    padding: "12px 16px",
    borderBottom: "1px solid #f3f4f6",
  },
  cardTime: { fontSize: 13, color: "#6b7280" },
  deleteBtn: {
    background: "none",
    border: "none",
    color: "#dc2626",
    fontSize: 13,
    cursor: "pointer",
    padding: "2px 6px",
  },
  cardPhotoWrap: { background: "#000" },
  cardPhoto: {
    width: "100%",
    display: "block",
    maxHeight: 480,
    objectFit: "contain",
  },
  cardContent: {
    margin: 0,
    padding: 16,
    fontSize: 15,
    lineHeight: 1.5,
    whiteSpace: "pre-wrap",
    wordBreak: "break-word",
  },
  cardTags: {
    margin: 0,
    padding: "0 16px 16px",
    fontSize: 13,
    color: "#6b7280",
  },
  muted: { color: "#6b7280", fontSize: 14, padding: 24 },
};
