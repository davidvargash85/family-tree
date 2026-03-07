import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "../api";

const formatCommentDate = (dateStr) => {
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

function buildThreadTree(comments) {
  const byId = new Map(comments.map((c) => [c.id, { ...c, replies: [] }]));
  const roots = [];
  comments.forEach((c) => {
    const node = byId.get(c.id);
    if (!node) return;
    if (c.parentId) {
      const parent = byId.get(c.parentId);
      if (parent) parent.replies.push(node);
      else roots.push(node);
    } else {
      roots.push(node);
    }
  });
  roots.sort((a, b) => new Date(a.createdAt) - new Date(b.createdAt));
  roots.forEach((r) => r.replies.sort((a, b) => new Date(a.createdAt) - new Date(b.createdAt)));
  return roots;
}

const styles = {
  section: {
    borderTop: "1px solid #f3f4f6",
    padding: "12px 16px 16px",
  },
  header: { fontSize: 13, fontWeight: 600, color: "#374151", marginBottom: 10 },
  list: { listStyle: "none", margin: 0, padding: 0 },
  comment: { marginBottom: 10 },
  commentReply: { marginLeft: 24, marginBottom: 8, paddingLeft: 12, borderLeft: "2px solid #e5e7eb" },
  commentHead: { display: "flex", alignItems: "baseline", gap: 8, flexWrap: "wrap", marginBottom: 2 },
  author: { fontWeight: 600, fontSize: 13, color: "#1f2937" },
  time: { fontSize: 12, color: "#9ca3af" },
  content: { fontSize: 14, color: "#374151", lineHeight: 1.45, whiteSpace: "pre-wrap", wordBreak: "break-word" },
  replyBtn: {
    background: "none",
    border: "none",
    color: "#2563eb",
    fontSize: 12,
    cursor: "pointer",
    padding: "2px 0",
    marginTop: 4,
  },
  form: { marginTop: 12 },
  input: {
    width: "100%",
    padding: "10px 12px",
    border: "1px solid #d1d5db",
    borderRadius: 8,
    fontSize: 14,
    minHeight: 40,
    resize: "vertical",
    boxSizing: "border-box",
  },
  submitRow: { display: "flex", justifyContent: "flex-end", marginTop: 8 },
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
  empty: { fontSize: 13, color: "#9ca3af", marginBottom: 10 },
};

function CommentItem({ node, replyingToId, replyDraft, onReplyDraftChange, onStartReply, onCancelReply, onSubmitReply, isPending, depth = 0 }) {
  const isReply = depth > 0;
  const isReplying = replyingToId === node.id;
  const draft = isReplying ? replyDraft : "";

  const handleSubmitReply = () => {
    const text = (isReplying ? replyDraft : "").trim();
    if (!text) return;
    onSubmitReply(node.id, text);
    onCancelReply();
  };

  return (
    <li style={isReply ? styles.commentReply : styles.comment}>
      <div style={styles.commentHead}>
        <span style={styles.author}>{node.author?.displayName || node.author?.email || "Someone"}</span>
        <span style={styles.time}>{formatCommentDate(node.createdAt)}</span>
      </div>
      <p style={styles.content}>{node.content}</p>
      {!isReply && onStartReply && (
        <button type="button" style={styles.replyBtn} onClick={() => onStartReply(node.id)}>
          Reply
        </button>
      )}
      {isReplying && (
        <div style={styles.form}>
          <textarea
            placeholder="Write a reply…"
            rows={2}
            maxLength={2000}
            value={draft}
            onChange={(e) => onReplyDraftChange(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                handleSubmitReply();
              }
            }}
            style={styles.input}
          />
          <div style={styles.submitRow}>
            <button type="button" style={{ ...styles.submitBtn, background: "#f3f4f6", color: "#374151" }} onClick={onCancelReply}>
              Cancel
            </button>
            <button
              type="button"
              style={styles.submitBtn}
              onClick={handleSubmitReply}
              disabled={!draft.trim() || isPending}
            >
              {isPending ? "Sending…" : "Reply"}
            </button>
          </div>
        </div>
      )}
      {node.replies?.length > 0 && (
        <ul style={{ ...styles.list, marginTop: 8 }}>
          {node.replies.map((reply) => (
            <CommentItem
              key={reply.id}
              node={reply}
              depth={depth + 1}
            />
          ))}
        </ul>
      )}
    </li>
  );
}

export default function PublicationComments({ treeId, publicationId }) {
  const queryClient = useQueryClient();
  const [replyingToId, setReplyingToId] = useState(null);
  const [replyDraft, setReplyDraft] = useState("");
  const [newCommentText, setNewCommentText] = useState("");

  const { data, isLoading } = useQuery({
    queryKey: ["comments", treeId, publicationId],
    queryFn: async () => {
      const { data: res } = await api.get(
        `/trees/${treeId}/publications/${publicationId}/comments`
      );
      return res;
    },
    enabled: !!treeId && !!publicationId,
  });

  const createComment = useMutation({
    mutationFn: ({ content, parentId }) =>
      api.post(`/trees/${treeId}/publications/${publicationId}/comments`, {
        content,
        parentId: parentId || undefined,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["comments", treeId, publicationId] });
    },
  });

  const comments = data?.comments ?? [];
  const tree = buildThreadTree(comments);

  const handleSubmitTopLevel = () => {
    const text = newCommentText.trim();
    if (!text) return;
    createComment.mutate(
      { content: text },
      { onSuccess: () => setNewCommentText("") }
    );
  };

  const handleSubmitReply = (parentId, content) => {
    createComment.mutate({ content, parentId });
  };

  return (
    <section style={styles.section}>
      <h3 style={styles.header}>
        {comments.length === 0 ? "Comments" : `${comments.length} ${comments.length === 1 ? "comment" : "comments"}`}
      </h3>
      {isLoading ? (
        <p style={styles.empty}>Loading comments…</p>
      ) : (
        <>
          {tree.length > 0 && (
            <ul style={styles.list}>
              {tree.map((node) => (
                <CommentItem
                  key={node.id}
                  node={node}
                  onStartReply={(id) => { setReplyingToId(id); setReplyDraft(""); }}
                  replyingToId={replyingToId}
                  replyDraft={replyDraft}
                  onReplyDraftChange={setReplyDraft}
                  onCancelReply={() => { setReplyingToId(null); setReplyDraft(""); }}
                  onSubmitReply={(parentId, content) => handleSubmitReply(parentId, content)}
                  isPending={createComment.isPending}
                />
              ))}
            </ul>
          )}
          <div style={styles.form}>
            <textarea
              placeholder="Add a comment…"
              value={newCommentText}
              onChange={(e) => setNewCommentText(e.target.value)}
              rows={2}
              maxLength={2000}
              style={styles.input}
            />
            <div style={styles.submitRow}>
              <button
                type="button"
                style={styles.submitBtn}
                onClick={handleSubmitTopLevel}
                disabled={!newCommentText.trim() || createComment.isPending}
              >
                {createComment.isPending ? "Sending…" : "Comment"}
              </button>
            </div>
          </div>
        </>
      )}
    </section>
  );
}
