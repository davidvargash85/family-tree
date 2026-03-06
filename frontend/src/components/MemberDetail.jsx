import { useState, useMemo, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Trash2 } from "lucide-react";
import { api } from "../api";
import { isAliveSentinel, formatDeathDate } from "../utils/memberDates";
import ConfirmModal from "./ConfirmModal";

function countDescendants(relationships, memberId) {
  const parentRels = (relationships || []).filter((r) => r.type === "parent");
  const childrenMap = new Map();
  parentRels.forEach((r) => {
    if (!childrenMap.has(r.memberAId)) childrenMap.set(r.memberAId, []);
    childrenMap.get(r.memberAId).push(r.memberBId);
  });
  const seen = new Set();
  const queue = [memberId];
  while (queue.length) {
    const id = queue.shift();
    if (seen.has(id)) continue;
    seen.add(id);
    (childrenMap.get(id) || []).forEach((c) => queue.push(c));
  }
  seen.delete(memberId);
  return seen.size;
}

export default function MemberDetail({ treeId, memberId, canEdit, onClose, onDeleted, onRequestDelete, placement = "side" }) {
  const queryClient = useQueryClient();
  const [editing, setEditing] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [hoveredRemoveRelId, setHoveredRemoveRelId] = useState(null);
  const [hoveredDeleteBtn, setHoveredDeleteBtn] = useState(false);

  const { data: member, isLoading } = useQuery({
    queryKey: ["member", treeId, memberId],
    queryFn: async () => {
      const { data } = await api.get(`/trees/${treeId}/members/${memberId}`);
      return data.member;
    },
  });

  const { data: relsData } = useQuery({
    queryKey: ["relationships", treeId],
    queryFn: async () => {
      const { data } = await api.get(`/trees/${treeId}/relationships`);
      return data;
    },
    enabled: !!treeId,
  });

  const allRelationships = relsData?.relationships ?? [];
  const relationships = allRelationships.filter(
    (r) => r.memberAId === memberId || r.memberBId === memberId
  );
  const descendantCount = useMemo(
    () => countDescendants(allRelationships, memberId),
    [allRelationships, memberId]
  );

  const updateMember = useMutation({
    mutationFn: (payload) => api.patch(`/trees/${treeId}/members/${memberId}`, payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["member", treeId, memberId] });
      queryClient.invalidateQueries({ queryKey: ["members", treeId] });
      setEditing(false);
    },
  });

  const deletePhoto = useMutation({
    mutationFn: () => api.delete(`/trees/${treeId}/members/${memberId}/photo`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["member", treeId, memberId] });
      queryClient.invalidateQueries({ queryKey: ["members", treeId] });
    },
  });

  const deleteRelationship = useMutation({
    mutationFn: (relId) => api.delete(`/trees/${treeId}/relationships/${relId}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["relationships", treeId] });
      queryClient.invalidateQueries({ queryKey: ["member", treeId, memberId] });
    },
  });

  const addRelationship = useMutation({
    mutationFn: (body) => api.post(`/trees/${treeId}/relationships`, body),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["relationships", treeId] });
      queryClient.invalidateQueries({ queryKey: ["member", treeId, memberId] });
    },
  });

  const deleteMember = useMutation({
    mutationFn: () => api.delete(`/trees/${treeId}/members/${memberId}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["members", treeId] });
      queryClient.invalidateQueries({ queryKey: ["relationships", treeId] });
      queryClient.invalidateQueries({ queryKey: ["member", treeId, memberId] });
      setShowDeleteConfirm(false);
      onClose?.();
      onDeleted?.();
    },
  });

  if (isLoading || !member) return null;

  const panelStyle =
    placement === "top"
      ? { ...styles.panel, ...styles.panelOnTop }
      : placement === "popover"
        ? { ...styles.panel, ...styles.panelPopover }
        : styles.panel;

  return (
    <aside style={panelStyle}>
      <button type="button" onClick={onClose} style={styles.closeBtn} aria-label="Close">×</button>

      <div style={styles.photoWrap}>
        {member.photoUrl ? (
          <img src={member.photoUrl} alt="" style={styles.photoImg} />
        ) : (
          <span style={styles.photoPlaceholder}>{member.name.charAt(0)}</span>
        )}
        {canEdit && (
          <div style={styles.photoActions}>
            <label style={styles.uploadLabel}>
              <input
                type="file"
                accept="image/*"
                style={{ display: "none" }}
                onChange={async (e) => {
                  const file = e.target.files?.[0];
                  if (!file) return;
                  const form = new FormData();
                  form.append("photo", file);
                  await api.post(`/trees/${treeId}/members/${memberId}/photo`, form);
                  queryClient.invalidateQueries({ queryKey: ["member", treeId, memberId] });
                  queryClient.invalidateQueries({ queryKey: ["members", treeId] });
                }}
              />
              Upload
            </label>
            {member.photoUrl && (
              <button type="button" onClick={() => deletePhoto.mutate()} style={styles.removePhotoBtn}>
                Remove
              </button>
            )}
          </div>
        )}
      </div>

      {editing ? (
        <MemberEditForm
          member={member}
          onSave={(payload) => updateMember.mutate(payload)}
          onCancel={() => setEditing(false)}
          saving={updateMember.isPending}
        />
      ) : (
        <>
          <h3 style={styles.name}>{member.name}</h3>
          {(member.birthDate || member.deathDate) && (
            <p style={styles.dates}>
              {member.birthDate ? new Date(member.birthDate).toLocaleDateString() : "?"}
              {" – "}
              {formatDeathDate(member.deathDate)}
            </p>
          )}
          {member.bio && <p style={styles.bio}>{member.bio}</p>}
          {canEdit && (
            <div style={styles.editDeleteRow}>
              <button type="button" onClick={() => setEditing(true)} style={styles.editBtn}>
                Edit
              </button>
              <button
                type="button"
                onClick={() => (onRequestDelete ? onRequestDelete(memberId) : setShowDeleteConfirm(true))}
                onMouseEnter={() => setHoveredDeleteBtn(true)}
                onMouseLeave={() => setHoveredDeleteBtn(false)}
                style={hoveredDeleteBtn ? styles.deleteBtnIconDanger : styles.deleteBtnIcon}
                title="Delete"
                aria-label="Delete"
              >
                <Trash2 size={16} />
              </button>
            </div>
          )}

          {showDeleteConfirm && (
            <ConfirmModal
              open={showDeleteConfirm}
              title="Delete member?"
              message={
                descendantCount > 0
                  ? `This will permanently delete ${member.name} and ${descendantCount} descendant(s) (${descendantCount + 1} people total). This cannot be undone.`
                  : `This will permanently delete ${member.name}. This cannot be undone.`
              }
              confirmLabel="Delete"
              danger
              onConfirm={() => deleteMember.mutate()}
              onCancel={() => setShowDeleteConfirm(false)}
              isPending={deleteMember.isPending}
            />
          )}

          <h4 style={styles.relsTitle}>Relationships</h4>
          {relationships.length === 0 ? (
            <p style={styles.muted}>None yet</p>
          ) : (
            <ul style={styles.relsList}>
              {relationships.map((r) => {
                const other = r.memberAId === memberId ? r.memberB : r.memberA;
                // We store parent→child as type "parent" (memberA=parent, memberB=child). Display role from current person's perspective. Support legacy "child" type.
                const displayType =
                  r.type === "parent"
                    ? r.memberAId === memberId
                      ? "child"
                      : "parent"
                    : r.type === "child"
                      ? r.memberBId === memberId
                        ? "parent"
                        : "child"
                      : r.type;
                return (
                  <li key={r.id} style={styles.relItem}>
                    <span>{other.name}</span>
                    <span style={styles.relType}>{displayType}</span>
                    {canEdit && (
                      <button
                        type="button"
                        onClick={() => deleteRelationship.mutate(r.id)}
                        onMouseEnter={() => setHoveredRemoveRelId(r.id)}
                        onMouseLeave={() => setHoveredRemoveRelId(null)}
                        style={hoveredRemoveRelId === r.id ? styles.relRemoveBtnDanger : styles.relRemoveBtn}
                        title="Remove relationship"
                        aria-label="Remove relationship"
                      >
                        <Trash2 size={16} />
                      </button>
                    )}
                  </li>
                );
              })}
            </ul>
          )}
          {canEdit && (
            <AddRelationshipForm
              treeId={treeId}
              currentMemberId={memberId}
              onSubmit={(body) => addRelationship.mutate(body)}
              isPending={addRelationship.isPending}
            />
          )}
        </>
      )}
    </aside>
  );
}

function MemberEditForm({ member, onSave, onCancel, saving }) {
  const isDeceased = member.deathDate != null && !isAliveSentinel(member.deathDate);
  const [name, setName] = useState(member.name);
  const [birthDate, setBirthDate] = useState(
    member.birthDate ? new Date(member.birthDate).toISOString().slice(0, 10) : ""
  );
  const [deceased, setDeceased] = useState(isDeceased);
  const [deathDate, setDeathDate] = useState(
    isDeceased && member.deathDate ? new Date(member.deathDate).toISOString().slice(0, 10) : ""
  );
  const [bio, setBio] = useState(member.bio ?? "");

  const handleSubmit = (e) => {
    e.preventDefault();
    onSave({
      name,
      birthDate: birthDate || null,
      deceased,
      deathDate: deceased ? (deathDate || null) : null,
      bio: bio || null,
    });
  };

  return (
    <form onSubmit={handleSubmit} style={styles.form}>
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
      <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
        <input
          id="edit-member-deceased"
          type="checkbox"
          checked={deceased}
          onChange={(e) => setDeceased(e.target.checked)}
          style={{ width: 18, height: 18 }}
        />
        <label htmlFor="edit-member-deceased" style={{ fontSize: 14 }}>Deceased</label>
      </div>
      {deceased && (
        <input
          type="date"
          value={deathDate}
          onChange={(e) => setDeathDate(e.target.value)}
          style={styles.input}
        />
      )}
      <textarea
        value={bio}
        onChange={(e) => setBio(e.target.value)}
        placeholder="Bio"
        rows={3}
        style={styles.input}
      />
      <div style={styles.formActions}>
        <button type="button" onClick={onCancel} style={styles.cancelBtn}>
          Cancel
        </button>
        <button type="submit" disabled={saving} style={styles.saveBtn}>
          {saving ? "Saving..." : "Save"}
        </button>
      </div>
    </form>
  );
}

const DEBOUNCE_MS = 300;

function AddRelationshipForm({ treeId, currentMemberId, onSubmit, isPending }) {
  const [otherId, setOtherId] = useState("");
  const [selectedMemberName, setSelectedMemberName] = useState("");
  const [type, setType] = useState("spouse");
  const [searchQuery, setSearchQuery] = useState("");
  const [debouncedQuery, setDebouncedQuery] = useState("");

  useEffect(() => {
    const t = setTimeout(() => setDebouncedQuery(searchQuery), DEBOUNCE_MS);
    return () => clearTimeout(t);
  }, [searchQuery]);

  const searchTerm = debouncedQuery.trim();
  const { data: searchData } = useQuery({
    queryKey: ["members", "search", treeId, searchTerm],
    queryFn: async () => {
      const { data } = await api.get(`/trees/${treeId}/members/search`, {
        params: { q: searchTerm },
      });
      return data;
    },
    enabled: !!treeId && searchTerm.length >= 3,
  });

  const searchResults = searchData?.members ?? [];
  const others = searchResults.filter((m) => m.id !== currentMemberId);

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!otherId) return;
    if (type === "parent") {
      onSubmit({ memberAId: currentMemberId, memberBId: otherId, type: "parent" });
    } else {
      onSubmit({ memberAId: currentMemberId, memberBId: otherId, type });
    }
    setOtherId("");
    setSelectedMemberName("");
    setSearchQuery("");
    setDebouncedQuery("");
  };

  const handleSelectMember = (m) => {
    setOtherId(m.id);
    setSelectedMemberName(m.name);
    setSearchQuery("");
  };

  const handleClearSelection = () => {
    setOtherId("");
    setSelectedMemberName("");
    setSearchQuery("");
  };

  const showList = !otherId && (searchQuery.length > 0 || others.length > 0);

  return (
    <form onSubmit={handleSubmit} style={styles.addRelForm}>
      <h4 style={styles.relsTitle}>Add relationship</h4>
      <div style={styles.searchWrap}>
        {otherId && selectedMemberName ? (
          <div style={styles.selectedRow}>
            <span style={styles.selectedName}>{selectedMemberName}</span>
            <button
              type="button"
              onClick={handleClearSelection}
              style={styles.clearSelectionBtn}
            >
              Change
            </button>
          </div>
        ) : (
          <>
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search by name..."
              style={styles.input}
              autoComplete="off"
            />
            {showList && (
              <ul style={styles.searchResults}>
                {searchQuery.trim().length > 0 && searchQuery.trim().length < 3 ? (
                  <li style={styles.searchResultItemMuted}>Type at least 3 characters to search</li>
                ) : others.length === 0 ? (
                  <li style={styles.searchResultItemMuted}>No matches</li>
                ) : (
                  others.map((m) => (
                    <li key={m.id}>
                      <button
                        type="button"
                        style={styles.searchResultItem}
                        onClick={() => handleSelectMember(m)}
                      >
                        {m.name}
                      </button>
                    </li>
                  ))
                )}
              </ul>
            )}
          </>
        )}
      </div>
      <select value={type} onChange={(e) => setType(e.target.value)} style={styles.input}>
        <option value="parent">Child (this person is the parent)</option>
        <option value="spouse">Spouse</option>
        <option value="sibling">Sibling</option>
      </select>
      <button type="submit" disabled={isPending || !otherId} style={styles.saveBtn}>
        {isPending ? "Adding..." : "Add"}
      </button>
    </form>
  );
}

const styles = {
  panel: {
    width: 320,
    background: "#fff",
    borderRadius: 12,
    padding: 20,
    boxShadow: "0 4px 20px rgba(0,0,0,0.08)",
    position: "relative",
  },
  panelOnTop: {
    width: "100%",
    maxWidth: "none",
    marginBottom: 16,
    flexShrink: 0,
  },
  panelPopover: {
    maxHeight: "85vh",
    overflowY: "auto",
  },
  closeBtn: {
    position: "absolute",
    top: 8,
    right: 8,
    background: "none",
    border: "none",
    fontSize: 24,
    color: "#666",
    lineHeight: 1,
    cursor: "pointer",
  },
  photoWrap: { textAlign: "center", marginBottom: 12 },
  photoImg: {
    width: 80,
    height: 80,
    borderRadius: "50%",
    objectFit: "cover",
    background: "#e5e7eb",
  },
  photoPlaceholder: {
    display: "inline-flex",
    alignItems: "center",
    justifyContent: "center",
    width: 80,
    height: 80,
    borderRadius: "50%",
    background: "#e5e7eb",
    fontSize: 28,
    fontWeight: 600,
    color: "#6b7280",
  },
  photoActions: { marginTop: 8, display: "flex", gap: 8, justifyContent: "center" },
  uploadLabel: {
    cursor: "pointer",
    fontSize: 13,
    color: "#2563eb",
  },
  removePhotoBtn: { background: "none", border: "none", color: "#b91c1c", fontSize: 13 },
  name: { margin: "0 0 8px", textAlign: "center" },
  dates: { margin: "0 0 12px", fontSize: 14, color: "#6b7280", textAlign: "center" },
  bio: { margin: "0 0 12px", fontSize: 14, lineHeight: 1.5 },
  editDeleteRow: { display: "flex", gap: 8, marginBottom: 16 },
  editBtn: {
    flex: 1,
    padding: 8,
    background: "#f3f4f6",
    border: "none",
    borderRadius: 8,
    cursor: "pointer",
  },
  deleteBtn: {
    flex: 1,
    padding: 8,
    background: "none",
    border: "1px solid #b91c1c",
    borderRadius: 8,
    color: "#b91c1c",
    cursor: "pointer",
  },
  deleteBtnIcon: {
    flex: 1,
    padding: 8,
    border: "none",
    background: "none",
    borderRadius: 6,
    cursor: "pointer",
    color: "#6b7280",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    transition: "background-color 0.15s ease, color 0.15s ease",
  },
  deleteBtnIconDanger: {
    flex: 1,
    padding: 8,
    border: "none",
    borderRadius: 6,
    cursor: "pointer",
    backgroundColor: "rgba(185, 28, 28, 0.12)",
    color: "#b91c1c",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    transition: "background-color 0.15s ease, color 0.15s ease",
  },
  relsTitle: { margin: "0 0 8px", fontSize: 14 },
  addRelForm: { marginTop: 12, paddingTop: 12, borderTop: "1px solid #eee", display: "flex", flexDirection: "column", gap: 8 },
  searchWrap: { position: "relative" },
  selectedRow: { display: "flex", alignItems: "center", gap: 8, padding: "10px 12px", border: "1px solid #d1d5db", borderRadius: 8, background: "#f9fafb" },
  selectedName: { flex: 1, fontSize: 14 },
  clearSelectionBtn: { background: "none", border: "none", color: "#2563eb", fontSize: 13, cursor: "pointer" },
  searchResults: { listStyle: "none", margin: "4px 0 0", padding: 4, border: "1px solid #e5e7eb", borderRadius: 8, background: "#fff", boxShadow: "0 4px 12px rgba(0,0,0,0.1)", maxHeight: 200, overflowY: "auto", position: "relative", zIndex: 1 },
  searchResultItem: { display: "block", width: "100%", padding: "8px 12px", textAlign: "left", border: "none", borderRadius: 6, background: "none", cursor: "pointer", fontSize: 14, color: "#374151" },
  searchResultItemMuted: { padding: "8px 12px", fontSize: 14, color: "#9ca3af" },
  muted: { margin: 0, fontSize: 13, color: "#6b7280" },
  relsList: { listStyle: "none", margin: 0, padding: 0 },
  relItem: { display: "flex", alignItems: "center", gap: 8, marginBottom: 6, fontSize: 14 },
  relType: { color: "#6b7280", textTransform: "capitalize" },
  relRemoveBtn: {
    marginLeft: "auto",
    padding: 4,
    border: "none",
    background: "none",
    borderRadius: 6,
    cursor: "pointer",
    color: "#6b7280",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    transition: "background-color 0.15s ease, color 0.15s ease",
  },
  relRemoveBtnDanger: {
    marginLeft: "auto",
    padding: 4,
    border: "none",
    borderRadius: 6,
    cursor: "pointer",
    backgroundColor: "rgba(185, 28, 28, 0.12)",
    color: "#b91c1c",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    transition: "background-color 0.15s ease, color 0.15s ease",
  },
  form: { display: "flex", flexDirection: "column", gap: 10 },
  input: { padding: "10px 12px", border: "1px solid #d1d5db", borderRadius: 8, fontSize: 14 },
  formActions: { display: "flex", gap: 8, marginTop: 8 },
  cancelBtn: { padding: "8px 16px", background: "#f3f4f6", border: "none", borderRadius: 8, cursor: "pointer" },
  saveBtn: { padding: "8px 16px", background: "#1e3a5f", color: "#fff", border: "none", borderRadius: 8, cursor: "pointer" },
};
