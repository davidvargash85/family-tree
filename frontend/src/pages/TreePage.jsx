import { useState } from "react";
import { useParams, Link } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "../api";
import TreeGraph from "../components/TreeGraph";
import MemberDetail from "../components/MemberDetail";
import MemberPopover from "../components/MemberPopover";
import AddMemberModal from "../components/AddMemberModal";
import RelationshipTypeModal from "../components/RelationshipTypeModal";
import ConfirmModal from "../components/ConfirmModal";
import { formatDeathYear } from "../utils/memberDates";
import { countDescendants } from "../utils/descendants";

export default function TreePage() {
  const { treeId } = useParams();
  const queryClient = useQueryClient();
  const [selectedMemberId, setSelectedMemberId] = useState(null);
  const [popoverAnchorRect, setPopoverAnchorRect] = useState(null);
  const [view, setView] = useState("graph");
  const [showAddMember, setShowAddMember] = useState(false);
  const [pendingConnection, setPendingConnection] = useState(null);
  const [addMemberThenLink, setAddMemberThenLink] = useState(null);
  const [deleteFromCard, setDeleteFromCard] = useState(null);

  const handleGraphNodeClick = (nodeId, anchorRect, options) => {
    setSelectedMemberId(options?.memberId ?? nodeId);
    setPopoverAnchorRect(anchorRect ?? null);
  };
  const closePopover = () => {
    setSelectedMemberId(null);
    setPopoverAnchorRect(null);
  };

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
    mutationFn: ({ body }) => api.post(`/trees/${treeId}/members`, body),
    onSuccess: (response, variables) => {
      queryClient.invalidateQueries({ queryKey: ["members", treeId] });
      setShowAddMember(false);
      const link = variables?.linkAfterCreate;
      const newMemberId = response?.data?.member?.id;
      if (link && newMemberId) {
        createRelationship.mutate({
          memberAId: link.otherMemberId,
          memberBId: newMemberId,
          type: link.type,
        });
      }
      setAddMemberThenLink(null);
    },
  });

  const createRelationship = useMutation({
    mutationFn: (body) => {
      console.log("[family-tree addRelationship] frontend sending", JSON.stringify({ treeId, payload: body }));
      return api.post(`/trees/${treeId}/relationships`, body);
    },
    onSuccess: async () => {
      await queryClient.refetchQueries({ queryKey: ["relationships", treeId] });
      setPendingConnection(null);
    },
  });

  const deleteMember = useMutation({
    mutationFn: (memberId) => api.delete(`/trees/${treeId}/members/${memberId}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["members", treeId] });
      queryClient.invalidateQueries({ queryKey: ["relationships", treeId] });
      setDeleteFromCard(null);
      closePopover();
    },
  });

  const updateLayoutMutation = useMutation({
    mutationFn: (layoutPositions) => api.patch(`/trees/${treeId}`, { layoutPositions }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["tree", treeId] });
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
        {view === "list" && selectedMemberId && (
          <MemberDetail
            placement="top"
            treeId={treeId}
            memberId={selectedMemberId}
            canEdit={canEdit}
            onClose={() => setSelectedMemberId(null)}
            onDeleted={closePopover}
            onRequestDelete={canEdit ? (id) => setDeleteFromCard({ memberId: id, memberName: members.find((m) => m.id === id)?.name ?? "" }) : undefined}
          />
        )}
        {view === "graph" ? (
          <div style={styles.graphWrap}>
            <TreeGraph
              members={members}
              relationships={relationships}
              layoutPositions={tree.layoutPositions ?? undefined}
              onLayoutSave={canEdit ? (positions) => updateLayoutMutation.mutate(positions) : undefined}
              onNodeClick={handleGraphNodeClick}
              onConnectionRequest={canEdit ? setPendingConnection : undefined}
              onAddChild={canEdit ? (memberId) => { setAddMemberThenLink({ type: "parent", otherMemberId: memberId }); setShowAddMember(true); } : undefined}
              onAddSpouse={canEdit ? (memberId) => { setAddMemberThenLink({ type: "spouse", otherMemberId: memberId }); setShowAddMember(true); } : undefined}
              onDelete={canEdit ? (memberId) => setDeleteFromCard({ memberId, memberName: members.find((m) => m.id === memberId)?.name ?? "" }) : undefined}
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
                            –{formatDeathYear(m.deathDate)}
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
          onClose={() => { setShowAddMember(false); setAddMemberThenLink(null); }}
          onSubmit={(body) => createMember.mutate({ body, linkAfterCreate: addMemberThenLink ?? undefined })}
          isPending={createMember.isPending}
          linkContext={addMemberThenLink ? { type: addMemberThenLink.type, otherMemberName: members.find((m) => m.id === addMemberThenLink.otherMemberId)?.name ?? "" } : null}
        />
      )}

      {deleteFromCard && (
        <ConfirmModal
          open
          title="Delete member?"
          message={
            (() => {
              const n = countDescendants(relationships, deleteFromCard.memberId);
              return n > 0
                ? `This will permanently delete ${deleteFromCard.memberName || "?"} and ${n} descendant(s) (${n + 1} people total). This cannot be undone.`
                : `This will permanently delete ${deleteFromCard.memberName || "?"}. This cannot be undone.`;
            })()
          }
          confirmLabel="Delete"
          danger
          onConfirm={() => deleteMember.mutate(deleteFromCard.memberId)}
          onCancel={() => setDeleteFromCard(null)}
          isPending={deleteMember.isPending}
        />
      )}

      {pendingConnection && (
        <RelationshipTypeModal
          open
          sourceName={pendingConnection.sourceName}
          targetName={pendingConnection.targetName}
          sourceMemberId={pendingConnection.sourceMemberId}
          targetMemberId={pendingConnection.targetMemberId}
          onConfirm={(payload) => createRelationship.mutate(payload)}
          onCancel={() => setPendingConnection(null)}
          isPending={createRelationship.isPending}
        />
      )}

      {view === "graph" && selectedMemberId && (
        <MemberPopover
          treeId={treeId}
          memberId={selectedMemberId}
          canEdit={canEdit}
          onClose={closePopover}
          onDeleted={closePopover}
          onRequestDelete={canEdit ? (id) => setDeleteFromCard({ memberId: id, memberName: members.find((m) => m.id === id)?.name ?? "" }) : undefined}
          anchorRect={popoverAnchorRect}
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
