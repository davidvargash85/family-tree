import { useState } from "react";
import { useParams, Link } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "../api";
import TreeGraph from "../components/TreeGraph";
import MemberDetail from "../components/MemberDetail";

export default function TreePage() {
  const { treeId } = useParams();
  const queryClient = useQueryClient();
  const [selectedMemberId, setSelectedMemberId] = useState(null);
  const [view, setView] = useState("list");
  const [showAddMember, setShowAddMember] = useState(false);

  const { data: treeData, isLoading: treeLoading } = useQuery({
    queryKey: ["tree", treeId],
    queryFn: async () => {
      const { data } = await api.get(`/trees/${treeId}`);
      return data;
    },
  });

  const { data: membersData, isLoading: membersLoading } = useQuery({
    queryKey: ["members", treeId],
    queryFn: async () => {
      const { data } = await api.get(`/trees/${treeId}/members`);
      return data;
    },
    enabled: !!treeId,
  });

  const { data: relsData } = useQuery({
    queryKey: ["relationships", treeId],
    queryFn: async () => {
      const { data } = await api.get(`/trees/${treeId}/relationships`);
      return data;
    },
    enabled: !!treeId,
  });

  const createMember = useMutation({
    mutationFn: (body) => api.post(`/trees/${treeId}/members`, body),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["members", treeId] });
      setShowAddMember(false);
    },
  });

  const tree = treeData?.tree;
  const members = membersData?.members ?? [];
  const relationships = relsData?.relationships ?? [];
  const canEdit = tree && (tree.role === "owner" || tree.role === "editor");
  const isOwner = tree?.role === "owner";

  if (treeLoading || !tree) {
    return (
      <div style={styles.page}>
        <p style={styles.muted}>Loading tree...</p>
      </div>
    );
  }

  return (
    <div style={styles.page}>
      <header style={styles.header}>
        <Link to="/" style={styles.backLink}>← Dashboard</Link>
        <h1 style={styles.title}>{tree.name}</h1>
        <span style={styles.badge}>{tree.role}</span>
        {isOwner && (
          <Link to={`/tree/${treeId}/settings`} style={styles.settingsLink}>
            Settings
          </Link>
        )}
      </header>
      <main style={styles.main}>
        <div style={styles.content}>
          <div style={styles.toolbar}>
            <div style={styles.viewToggle}>
              <button
                type="button"
                onClick={() => setView("list")}
                style={{ ...styles.toggleBtn, borderRadius: "6px 0 0 6px", ...(view === "list" ? styles.toggleBtnActive : {}) }}
              >
                List
              </button>
              <button
                type="button"
                onClick={() => setView("graph")}
                style={{ ...styles.toggleBtn, borderRadius: "0 6px 6px 0", marginLeft: -1, ...(view === "graph" ? styles.toggleBtnActive : {}) }}
              >
                Tree
              </button>
            </div>
            {canEdit && (
              <button
                type="button"
                onClick={() => setShowAddMember(!showAddMember)}
                style={styles.addMemberBtn}
              >
                {showAddMember ? "Cancel" : "+ Add member"}
              </button>
            )}
          </div>

          {showAddMember && canEdit && (
            <AddMemberForm
              onSubmit={(body) => createMember.mutate(body)}
              onCancel={() => setShowAddMember(false)}
              isPending={createMember.isPending}
            />
          )}

          {view === "graph" ? (
            <div style={styles.graphWrap}>
              <TreeGraph
                members={members}
                relationships={relationships}
                onNodeClick={setSelectedMemberId}
              />
            </div>
          ) : (
            <section style={styles.section}>
              <h2 style={styles.sectionTitle}>Members</h2>
              {membersLoading ? (
                <p style={styles.muted}>Loading members...</p>
              ) : members.length === 0 ? (
                <p style={styles.muted}>No members yet. {canEdit && "Add a member to get started."}</p>
              ) : (
                <ul style={styles.memberList}>
                  {members.map((m) => (
                    <li
                      key={m.id}
                      style={{
                        ...styles.memberItem,
                        ...(selectedMemberId === m.id ? styles.memberItemSelected : {}),
                      }}
                      onClick={() => setSelectedMemberId(selectedMemberId === m.id ? null : m.id)}
                    >
                      <div style={styles.memberPhoto}>
                        {m.photoUrl ? (
                          <img src={m.photoUrl} alt="" style={styles.photoImg} />
                        ) : (
                          <span style={styles.photoPlaceholder}>{m.name.charAt(0)}</span>
                        )}
                      </div>
                      <div>
                        <strong>{m.name}</strong>
                        {(m.birthDate || m.deathDate) && (
                          <span style={styles.dates}>
                            {m.birthDate ? new Date(m.birthDate).getFullYear() : "?"}
                            –{m.deathDate ? new Date(m.deathDate).getFullYear() : "?"}
                          </span>
                        )}
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </section>
          )}

          {selectedMemberId && (
            <MemberDetail
              treeId={treeId}
              memberId={selectedMemberId}
              canEdit={canEdit}
              onClose={() => setSelectedMemberId(null)}
            />
          )}
        </div>
      </main>
    </div>
  );
}

function AddMemberForm({ onSubmit, onCancel, isPending }) {
  const [name, setName] = useState("");
  const [birthDate, setBirthDate] = useState("");
  const [deathDate, setDeathDate] = useState("");
  const [bio, setBio] = useState("");

  const handleSubmit = (e) => {
    e.preventDefault();
    onSubmit({
      name: name.trim(),
      birthDate: birthDate || null,
      deathDate: deathDate || null,
      bio: bio.trim() || null,
    });
    setName("");
    setBirthDate("");
    setDeathDate("");
    setBio("");
  };

  return (
    <form onSubmit={handleSubmit} style={styles.addForm}>
      <input
        value={name}
        onChange={(e) => setName(e.target.value)}
        placeholder="Name"
        required
        style={styles.input}
      />
      <input
        type="date"
        value={birthDate}
        onChange={(e) => setBirthDate(e.target.value)}
        style={styles.input}
      />
      <input
        type="date"
        value={deathDate}
        onChange={(e) => setDeathDate(e.target.value)}
        style={styles.input}
      />
      <textarea
        value={bio}
        onChange={(e) => setBio(e.target.value)}
        placeholder="Bio (optional)"
        rows={2}
        style={styles.input}
      />
      <div style={styles.formActions}>
        <button type="button" onClick={onCancel} style={styles.cancelBtn}>
          Cancel
        </button>
        <button type="submit" disabled={isPending} style={styles.saveBtn}>
          {isPending ? "Adding..." : "Add member"}
        </button>
      </div>
    </form>
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
  title: { margin: 0, fontSize: 20, fontWeight: 600, flex: 1 },
  badge: {
    background: "#e0e7ff",
    color: "#3730a3",
    padding: "4px 10px",
    borderRadius: 20,
    fontSize: 12,
    fontWeight: 600,
  },
  settingsLink: { fontSize: 14, color: "#2563eb" },
  main: { padding: 24, maxWidth: 1100, margin: "0 auto" },
  content: { display: "flex", gap: 24, alignItems: "flex-start" },
  toolbar: { display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 16, flex: 1 },
  viewToggle: { display: "flex", gap: 0 },
  toggleBtn: { padding: "8px 16px", border: "1px solid #d1d5db", background: "#fff" },
  toggleBtnActive: { background: "#1e3a5f", color: "#fff", borderColor: "#1e3a5f" },
  addMemberBtn: { padding: "8px 16px", background: "#1e3a5f", color: "#fff", border: "none", borderRadius: 8, cursor: "pointer" },
  graphWrap: { flex: 1, background: "#fff", borderRadius: 12, padding: 16, boxShadow: "0 1px 3px rgba(0,0,0,0.08)" },
  section: { flex: 1 },
  sectionTitle: { margin: "0 0 16px", fontSize: 18 },
  muted: { color: "#6b7280", fontSize: 14 },
  memberList: { listStyle: "none", margin: 0, padding: 0, display: "flex", flexDirection: "column", gap: 8 },
  memberItem: {
    display: "flex",
    alignItems: "center",
    gap: 12,
    padding: 12,
    background: "#fff",
    borderRadius: 10,
    cursor: "pointer",
    border: "2px solid transparent",
    boxShadow: "0 1px 2px rgba(0,0,0,0.05)",
  },
  memberItemSelected: { borderColor: "#1e3a5f", background: "#f8fafc" },
  memberPhoto: { width: 48, height: 48, borderRadius: "50%", overflow: "hidden", background: "#e5e7eb" },
  photoImg: { width: "100%", height: "100%", objectFit: "cover" },
  photoPlaceholder: { display: "flex", alignItems: "center", justifyContent: "center", width: "100%", height: "100%", fontSize: 18, fontWeight: 600, color: "#6b7280" },
  dates: { display: "block", fontSize: 12, color: "#6b7280" },
  addForm: { background: "#fff", padding: 16, borderRadius: 12, marginBottom: 16, display: "flex", flexWrap: "wrap", gap: 12, alignItems: "center", boxShadow: "0 1px 3px rgba(0,0,0,0.08)" },
  input: { padding: "10px 12px", border: "1px solid #d1d5db", borderRadius: 8, fontSize: 14, minWidth: 140 },
  formActions: { display: "flex", gap: 8 },
  cancelBtn: { padding: "8px 16px", background: "#f3f4f6", border: "none", borderRadius: 8, cursor: "pointer" },
  saveBtn: { padding: "8px 16px", background: "#1e3a5f", color: "#fff", border: "none", borderRadius: 8, cursor: "pointer" },
};
