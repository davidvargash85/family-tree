import { useState } from "react";
import { useParams, Link } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "../api";

export default function TreeSettings() {
  const { treeId } = useParams();
  const queryClient = useQueryClient();
  const [inviteEmail, setInviteEmail] = useState("");
  const [inviteRole, setInviteRole] = useState("editor");

  const { data: treeData } = useQuery({
    queryKey: ["tree", treeId],
    queryFn: async () => {
      const { data } = await api.get(`/trees/${treeId}`);
      return data;
    },
  });

  const { data: invitesData, isLoading: invitesLoading } = useQuery({
    queryKey: ["invitations", treeId],
    queryFn: async () => {
      const { data } = await api.get(`/trees/${treeId}/invitations`);
      return data;
    },
    enabled: !!treeId,
  });

  const createInvite = useMutation({
    mutationFn: (body) => api.post(`/trees/${treeId}/invitations`, body),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["invitations", treeId] });
      setInviteEmail("");
    },
  });

  const deleteInvite = useMutation({
    mutationFn: (invId) => api.delete(`/trees/${treeId}/invitations/${invId}`),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["invitations", treeId] }),
  });

  const tree = treeData?.tree;
  const invitations = invitesData?.invitations ?? [];

  if (!tree) return <div style={styles.page}><p>Loading...</p></div>;
  if (tree.role !== "owner") {
    return (
      <div style={styles.page}>
        <p>Only the tree owner can access settings.</p>
        <Link to={`/tree/${treeId}`}>Back to tree</Link>
      </div>
    );
  }

  const handleInvite = (e) => {
    e.preventDefault();
    if (!inviteEmail.trim()) return;
    createInvite.mutate({ email: inviteEmail.trim(), role: inviteRole });
  };

  const copyInviteUrl = (url) => {
    navigator.clipboard?.writeText(url);
  };

  return (
    <div style={styles.page}>
      <header style={styles.header}>
        <Link to={`/tree/${treeId}`} style={styles.backLink}>← Back to tree</Link>
        <h1 style={styles.title}>Tree settings</h1>
      </header>
      <main style={styles.main}>
        <section style={styles.section}>
          <h2 style={styles.sectionTitle}>Invite people</h2>
          <p style={styles.muted}>Invited users can view or edit this family tree. They need to sign up or sign in to accept.</p>
          <form onSubmit={handleInvite} style={styles.inviteForm}>
            <input
              type="email"
              value={inviteEmail}
              onChange={(e) => setInviteEmail(e.target.value)}
              placeholder="Email address"
              required
              style={styles.input}
            />
            <select value={inviteRole} onChange={(e) => setInviteRole(e.target.value)} style={styles.select}>
              <option value="viewer">Viewer (read only)</option>
              <option value="editor">Editor (can add and edit)</option>
            </select>
            <button type="submit" disabled={createInvite.isPending} style={styles.button}>
              {createInvite.isPending ? "Sending..." : "Send invite"}
            </button>
          </form>
        </section>

        <section style={styles.section}>
          <h2 style={styles.sectionTitle}>Pending invitations</h2>
          {invitesLoading ? (
            <p style={styles.muted}>Loading...</p>
          ) : invitations.length === 0 ? (
            <p style={styles.muted}>No pending invitations.</p>
          ) : (
            <ul style={styles.inviteList}>
              {invitations.map((inv) => (
                <li key={inv.id} style={styles.inviteItem}>
                  <div>
                    <strong>{inv.email}</strong>
                    <span style={styles.inviteRole}> · {inv.role}</span>
                  </div>
                  <div style={styles.inviteActions}>
                    <button
                      type="button"
                      onClick={() => copyInviteUrl(inv.inviteUrl)}
                      style={styles.copyBtn}
                    >
                      Copy link
                    </button>
                    <button
                      type="button"
                      onClick={() => deleteInvite.mutate(inv.id)}
                      style={styles.revokeBtn}
                    >
                      Revoke
                    </button>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </section>
      </main>
    </div>
  );
}

const styles = {
  page: { minHeight: "100vh", background: "#f5f2eb" },
  header: {
    background: "#fff",
    padding: "16px 24px",
    boxShadow: "0 1px 3px rgba(0,0,0,0.08)",
    display: "flex",
    alignItems: "center",
    gap: 16,
  },
  backLink: { color: "#2563eb", fontSize: 14 },
  title: { margin: 0, fontSize: 20, fontWeight: 600 },
  main: { padding: 24, maxWidth: 600, margin: "0 auto" },
  section: { background: "#fff", borderRadius: 12, padding: 24, marginBottom: 24, boxShadow: "0 1px 3px rgba(0,0,0,0.08)" },
  sectionTitle: { margin: "0 0 8px", fontSize: 18 },
  muted: { margin: "0 0 16px", color: "#6b7280", fontSize: 14 },
  inviteForm: { display: "flex", flexWrap: "wrap", gap: 12, alignItems: "center" },
  input: { padding: "10px 12px", border: "1px solid #d1d5db", borderRadius: 8, fontSize: 14, minWidth: 200 },
  select: { padding: "10px 12px", border: "1px solid #d1d5db", borderRadius: 8, fontSize: 14 },
  button: { padding: "10px 20px", background: "#1e3a5f", color: "#fff", border: "none", borderRadius: 8, cursor: "pointer" },
  inviteList: { listStyle: "none", margin: 0, padding: 0 },
  inviteItem: { display: "flex", justifyContent: "space-between", alignItems: "center", padding: "12px 0", borderBottom: "1px solid #eee" },
  inviteRole: { color: "#6b7280", fontSize: 14 },
  inviteActions: { display: "flex", gap: 8 },
  copyBtn: { padding: "6px 12px", background: "#f3f4f6", border: "none", borderRadius: 6, cursor: "pointer", fontSize: 13 },
  revokeBtn: { padding: "6px 12px", background: "none", border: "none", color: "#b91c1c", cursor: "pointer", fontSize: 13 },
};
