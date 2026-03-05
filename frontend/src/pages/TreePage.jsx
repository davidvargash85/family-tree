import { useState } from "react";
import { useParams, Link } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "../api";
import TreeGraph from "../components/TreeGraph";
import MemberDetail from "../components/MemberDetail";
import AddMemberModal from "../components/AddMemberModal";

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
            onClick={() => setShowAddMember(true)}
            style={styles.addMemberBtn}
          >
            + Add member
          </button>
        )}
      </div>

      <div style={styles.viewArea}>
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
      </div>

      {canEdit && (
        <AddMemberModal
          open={showAddMember}
          onClose={() => setShowAddMember(false)}
          onSubmit={(body) => createMember.mutate(body)}
          isPending={createMember.isPending}
        />
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
  );
}

const styles = {
  page: {
    minHeight: "100vh",
    background: "#f5f2eb",
    display: "grid",
    gridTemplateRows: "auto auto 1fr",
    gridTemplateColumns: "1fr",
  },
  header: {
    gridColumn: "1 / -1",
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
  toolbar: {
    gridColumn: "1 / -1",
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    padding: "12px 24px",
    background: "#fff",
    boxShadow: "0 1px 2px rgba(0,0,0,0.06)",
  },
  viewToggle: { display: "flex", gap: 0 },
  toggleBtn: { padding: "8px 16px", border: "1px solid #d1d5db", background: "#fff" },
  toggleBtnActive: { background: "#1e3a5f", color: "#fff", borderColor: "#1e3a5f" },
  addMemberBtn: { padding: "8px 16px", background: "#1e3a5f", color: "#fff", border: "none", borderRadius: 8, cursor: "pointer" },
  viewArea: {
    gridColumn: "1 / -1",
    minHeight: 0,
    padding: 24,
    overflow: "auto",
    display: "flex",
    flexDirection: "column",
  },
  graphWrap: {
    flex: 1,
    minHeight: 400,
    background: "#fff",
    borderRadius: 12,
    padding: 16,
    boxShadow: "0 1px 3px rgba(0,0,0,0.08)",
  },
  section: { maxWidth: 1100, margin: "0 auto", flex: "0 1 auto" },
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
};
