import { useState, useMemo, useRef } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Pencil, Trash2 } from "lucide-react";
import { api, resolvePhotoUrl } from "../api";
import { GenderIcon, GenderPicker } from "./icons";
import { isAliveSentinel, formatDeathDate } from "../utils/memberDates";
import ConfirmModal from "./ConfirmModal";
import DateField from "./DateField";
import { Button } from "./ui";

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
  const [photoHovered, setPhotoHovered] = useState(false);
  const [photoTrashHovered, setPhotoTrashHovered] = useState(false);
  const [deleteFooterHovered, setDeleteFooterHovered] = useState(false);
  const photoInputRef = useRef(null);

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
      {canEdit && !editing && (
        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={() => setEditing(true)}
          style={styles.editBtn}
          title="Edit"
          aria-label="Edit"
        >
          <Pencil size={16} />
        </Button>
      )}
      <Button type="button" variant="ghost" size="sm" onClick={onClose} style={styles.closeBtn} aria-label="Close">×</Button>

      <div style={styles.photoWrap}>
        <div
          style={styles.photoThumbRow}
          onMouseEnter={() => setPhotoHovered(true)}
          onMouseLeave={() => setPhotoHovered(false)}
        >
          <input
            ref={photoInputRef}
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
              e.target.value = "";
            }}
          />
          <button
            type="button"
            style={{
              ...styles.photoThumbWrap,
              ...(photoHovered && canEdit ? styles.photoThumbWrapHover : {}),
              cursor: canEdit ? "pointer" : "default",
            }}
            onClick={() => canEdit && photoInputRef.current?.click()}
            disabled={!canEdit}
            title={canEdit ? "Click to change photo" : undefined}
            aria-label={canEdit ? "Change photo" : undefined}
          >
            {member.photoUrl ? (
              <img src={resolvePhotoUrl(member.photoUrl)} alt="" style={styles.photoImg} />
            ) : (
              <span style={styles.photoPlaceholder}>{member.name.charAt(0)}</span>
            )}
          </button>
          {canEdit && member.photoUrl && (
            <div style={photoHovered ? styles.photoActionsColumnVisible : styles.photoActionsColumn}>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={(e) => { e.stopPropagation(); deletePhoto.mutate(); }}
                onMouseEnter={() => setPhotoTrashHovered(true)}
                onMouseLeave={() => setPhotoTrashHovered(false)}
                title="Remove photo"
                aria-label="Remove photo"
                style={photoTrashHovered ? styles.photoTrashBtnHover : styles.photoTrashBtn}
              >
                <Trash2 size={16} />
              </Button>
            </div>
          )}
        </div>
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
          {member.gender && (
            <p style={styles.gender} title={member.gender === "male" ? "Male" : "Female"} aria-label={member.gender === "male" ? "Male" : "Female"}>
              {member.gender === "male" ? (
                <GenderIcon variant="male" size={18} />
              ) : (
                <GenderIcon variant="female" size={18} />
              )}
            </p>
          )}
          {(member.birthDate || member.deathDate) && (
            <p style={styles.dates}>
              {member.birthDate ? new Date(member.birthDate).toLocaleDateString() : "?"}
              {" – "}
              {formatDeathDate(member.deathDate)}
            </p>
          )}
          {member.bio && <p style={styles.bio}>{member.bio}</p>}

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
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() => deleteRelationship.mutate(r.id)}
                        title="Remove relationship"
                        aria-label="Remove relationship"
                        style={styles.relRemoveBtn}
                      >
                        <Trash2 size={16} />
                      </Button>
                    )}
                  </li>
                );
              })}
            </ul>
          )}
          {canEdit && (
            <div style={styles.deleteFooter}>
              <button
                type="button"
                onClick={() => (onRequestDelete ? onRequestDelete(memberId) : setShowDeleteConfirm(true))}
                onMouseEnter={() => setDeleteFooterHovered(true)}
                onMouseLeave={() => setDeleteFooterHovered(false)}
                title="Remove family member"
                aria-label="Remove family member"
                style={deleteFooterHovered ? styles.deleteFooterBtnHover : styles.deleteFooterBtn}
              >
                Delete family member
              </button>
            </div>
          )}
        </>
      )}
    </aside>
  );
}

function MemberEditForm({ member, onSave, onCancel, saving }) {
  const isDeceased = member.deathDate != null && !isAliveSentinel(member.deathDate);
  const [name, setName] = useState(member.name);
  const [gender, setGender] = useState(member.gender ?? "");
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
      gender: gender || null,
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
      <div style={styles.formField}>
        <span style={styles.formLabel}>Gender</span>
        <GenderPicker
          id="edit-member-gender"
          aria-label="Gender"
          value={gender}
          onChange={setGender}
        />
      </div>
      <textarea
        value={bio}
        onChange={(e) => setBio(e.target.value)}
        placeholder="Bio"
        rows={3}
        style={styles.input}
      />
      <DateField
        id="edit-member-birth"
        label="Birth date"
        value={birthDate}
        onChange={setBirthDate}
        placeholder="Optional"
        openUp
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
        <DateField
          id="edit-member-death"
          label="Death date"
          value={deathDate}
          onChange={setDeathDate}
          placeholder="Select date"
          openUp
        />
      )}
      <div style={styles.formActions}>
        <Button type="button" variant="ghost" onClick={onCancel}>
          Cancel
        </Button>
        <Button type="submit" variant="primary" disabled={saving} loading={saving} loadingLabel="Saving...">
          Save
        </Button>
      </div>
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
  photoWrap: {
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 12,
  },
  /* Row is hover target; image stays centered in card; delete is absolute to the right of image */
  photoThumbRow: {
    position: "relative",
    width: 120,
    minHeight: 80,
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    overflow: "visible",
  },
  photoThumbWrap: {
    position: "relative",
    padding: 0,
    border: "2px solid transparent",
    borderRadius: "50%",
    background: "none",
    flexShrink: 0,
    transition: "border-color 0.15s ease, box-shadow 0.15s ease",
  },
  photoThumbWrapHover: {
    border: "2px solid #93c5fd",
    boxShadow: "0 2px 8px rgba(59, 130, 246, 0.25)",
  },
  photoImg: {
    width: 80,
    height: 80,
    borderRadius: "50%",
    objectFit: "cover",
    background: "#e5e7eb",
    display: "block",
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
  /* Absolute to the right of the image; vertically centered; opacity 0 until hover; z-index so it appears above */
  photoActionsColumn: {
    position: "absolute",
    left: 108,
    top: "50%",
    transform: "translateY(-50%)",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    minWidth: 28,
    minHeight: 28,
    opacity: 0,
    pointerEvents: "none",
    transition: "opacity 0.15s ease",
    zIndex: 1,
  },
  photoActionsColumnVisible: {
    position: "absolute",
    left: 108,
    top: "50%",
    transform: "translateY(-50%)",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    minWidth: 28,
    minHeight: 28,
    opacity: 1,
    pointerEvents: "auto",
    transition: "opacity 0.15s ease",
    zIndex: 1,
  },
  /* Match TreeGraph MemberNode delete: light red tint on hover, red icon (not solid red background) */
  photoTrashBtn: {
    minWidth: 0,
    padding: 4,
    backgroundColor: "transparent",
    color: "#6b7280",
    transition: "background-color 0.15s ease, color 0.15s ease",
  },
  photoTrashBtnHover: {
    minWidth: 0,
    padding: 4,
    backgroundColor: "rgba(185, 28, 28, 0.12)",
    color: "#b91c1c",
    border: "none",
    transition: "background-color 0.15s ease, color 0.15s ease",
  },
  name: { margin: "0 0 8px", textAlign: "center" },
  gender: { margin: "0 0 4px", display: "flex", justifyContent: "center", color: "#6b7280" },
  dates: { margin: "0 0 12px", fontSize: 14, color: "#6b7280", textAlign: "center" },
  bio: { margin: "0 0 12px", fontSize: 14, lineHeight: 1.5 },
  formField: { display: "flex", flexDirection: "column", gap: 4 },
  formLabel: { fontSize: 14, fontWeight: 500, color: "#374151" },
  editBtn: {
    position: "absolute",
    top: 8,
    left: 8,
    minWidth: 0,
    padding: 4,
  },
  deleteFooter: {
    marginTop: 16,
    paddingTop: 12,
    borderTop: "1px solid #e5e7eb",
  },
  deleteFooterBtn: {
    padding: 0,
    border: "none",
    background: "none",
    fontSize: 13,
    color: "#6b7280",
    cursor: "pointer",
    textDecoration: "none",
    transition: "color 0.15s ease",
  },
  deleteFooterBtnHover: {
    padding: 0,
    border: "none",
    background: "none",
    fontSize: 13,
    color: "#b91c1c",
    cursor: "pointer",
    textDecoration: "none",
    transition: "color 0.15s ease",
  },
  relsTitle: { margin: "0 0 8px", fontSize: 14 },
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
