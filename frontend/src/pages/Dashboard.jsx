import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Link, useNavigate } from "react-router-dom";
import { api } from "../api";
import { useAuth } from "../context/AuthContext";

const styles = {
  page: { minHeight: "100vh", background: "#f5f5f5" },
  header: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    padding: "1rem 1.5rem",
    background: "#fff",
    boxShadow: "0 1px 3px rgba(0,0,0,0.1)",
  },
  logo: { margin: 0, fontSize: "1.25rem", fontWeight: 600 },
  userRow: { display: "flex", alignItems: "center", gap: "0.75rem" },
  userName: { fontSize: "0.9rem", color: "#555" },
  logoutBtn: {
    padding: "0.4rem 0.75rem",
    background: "#333",
    color: "#fff",
    border: "none",
    borderRadius: "4px",
    cursor: "pointer",
    fontSize: "0.875rem",
  },
  main: { maxWidth: "600px", margin: "0 auto", padding: "1.5rem" },
  section: { background: "#fff", borderRadius: "8px", padding: "1.5rem", boxShadow: "0 1px 3px rgba(0,0,0,0.08)" },
  sectionTitle: { margin: "0 0 1rem", fontSize: "1.1rem" },
  createForm: { display: "flex", gap: "0.5rem", marginBottom: "1rem" },
  input: {
    flex: 1,
    padding: "0.5rem 0.75rem",
    border: "1px solid #ddd",
    borderRadius: "4px",
    fontSize: "1rem",
  },
  createBtn: {
    padding: "0.5rem 1rem",
    background: "#2563eb",
    color: "#fff",
    border: "none",
    borderRadius: "4px",
    cursor: "pointer",
    fontWeight: 500,
  },
  muted: { color: "#666", margin: "0.5rem 0", fontSize: "0.9rem" },
  treeList: { listStyle: "none", margin: 0, padding: 0 },
  treeItem: { marginBottom: "0.5rem" },
  treeRow: {
    display: "flex",
    alignItems: "center",
    gap: 8,
    padding: "0.75rem",
    background: "#f9f9f9",
    borderRadius: "6px",
  },
  treeLink: {
    flex: 1,
    textDecoration: "none",
    color: "inherit",
  },
  treeName: { display: "block", fontWeight: 500 },
  treeMeta: { display: "block", fontSize: "0.85rem", color: "#666", marginTop: "0.25rem" },
  timelineLink: { fontSize: "0.85rem", color: "#2563eb", textDecoration: "none" },
};

export default function Dashboard() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [newName, setNewName] = useState("");
  const [creating, setCreating] = useState(false);
  const { data, isLoading } = useQuery({
    queryKey: ["trees"],
    queryFn: async () => {
      const { data: res } = await api.get("/trees");
      return res;
    },
  });

  async function createTree(e) {
    e.preventDefault();
    if (!newName.trim()) return;
    setCreating(true);
    try {
      const { data: res } = await api.post("/trees", { name: newName.trim() });
      navigate(`/tree/${res.tree.id}`);
    } catch (_) {}
    setCreating(false);
  }

  const trees = data?.trees ?? [];

  return (
    <div style={styles.page}>
      <header style={styles.header}>
        <h1 style={styles.logo}>Family Tree</h1>
        <div style={styles.userRow}>
          <span style={styles.userName}>{user?.displayName || user?.email}</span>
          <button type="button" onClick={() => logout()} style={styles.logoutBtn}>
            Log out
          </button>
        </div>
      </header>
      <main style={styles.main}>
        <section style={styles.section}>
          <h2 style={styles.sectionTitle}>Your trees</h2>
          <form onSubmit={createTree} style={styles.createForm}>
            <input
              type="text"
              placeholder="New tree name"
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              style={styles.input}
            />
            <button type="submit" disabled={creating} style={styles.createBtn}>
              Create tree
            </button>
          </form>
          {isLoading ? (
            <p style={styles.muted}>Loading...</p>
          ) : trees.length === 0 ? (
            <p style={styles.muted}>No trees yet. Create one above.</p>
          ) : (
            <ul style={styles.treeList}>
              {trees.map((t) => (
                <li key={t.id} style={styles.treeItem}>
                  <div style={styles.treeRow}>
                    <Link to={`/tree/${t.id}`} style={styles.treeLink}>
                      <span style={styles.treeName}>{t.name}</span>
                      <span style={styles.treeMeta}>
                        {t.memberCount} member{t.memberCount !== 1 ? "s" : ""} · {t.role}
                      </span>
                    </Link>
                    <Link to={`/tree/${t.id}/timeline`} style={styles.timelineLink}>
                      Timeline
                    </Link>
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
