import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Link, useNavigate } from "react-router-dom";
import { api } from "../api";
import { useAuth } from "../context/AuthContext";

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
                  <Link to={`/tree/${t.id}`} style={styles.treeLink}>
                    <span style={styles.treeName}>{t.name}</span>
                    <span style={styles.treeMeta}>
                      {t.memberCount} member{t.memberCount !== 1 ? "s" : ""} · {t.role}
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </section>
      </main>
    </div>
  );
}
