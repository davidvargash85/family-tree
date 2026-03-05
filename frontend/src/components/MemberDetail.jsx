import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "../api";

export default function MemberDetail({ treeId, memberId, canEdit, onClose }) {
  const queryClient = useQueryClient();
  const [editing, setEditing] = useState(false);

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

  const { data: membersData } = useQuery({
    queryKey: ["members", treeId],
    queryFn: async () => {
      const { data } = await api.get(`/trees/${treeId}/members`);
      return data;
    },
    enabled: !!treeId,
  });

  const members = membersData?.members ?? [];
  const relationships = relsData?.relationships?.filter(
    (r) => r.memberAId === memberId || r.memberBId === memberId
  ) ?? [];

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

  if (isLoading || !member) return null;

  return (
    <aside style={styles.panel}>
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
              {member.deathDate ? new Date(member.deathDate).toLocaleDateString() : "Present"}
            </p>
          )}
          {member.bio && <p style={styles.bio}>{member.bio}</p>}
          {canEdit && (
            <button type="button" onClick={() => setEditing(true)} style={styles.editBtn}>
              Edit
            </button>
          )}

          <h4 style={styles.relsTitle}>Relationships</h4>
          {relationships.length === 0 ? (
            <p style={styles.muted}>None yet</p>
          ) : (
            <ul style={styles.relsList}>
              {relationships.map((r) => {
                const other = r.memberAId === memberId ? r.memberB : r.memberA;
                return (
                  <li key={r.id} style={styles.relItem}>
                    <span>{other.name}</span>
                    <span style={styles.relType}>{r.type}</span>
                    {canEdit && (
                      <button
                        type="button"
                        onClick={() => deleteRelationship.mutate(r.id)}
                        style={styles.removeRelBtn}
                      >
                        Remove
                      </button>
                    )}
                  </li>
                );
              })}
            </ul>
          )}
          {canEdit && members.length > 1 && (
            <AddRelationshipForm
              currentMemberId={memberId}
              members={members}
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
  const [name, setName] = useState(member.name);
  const [birthDate, setBirthDate] = useState(
    member.birthDate ? new Date(member.birthDate).toISOString().slice(0, 10) : ""
  );
  const [deathDate, setDeathDate] = useState(
    member.deathDate ? new Date(member.deathDate).toISOString().slice(0, 10) : ""
  );
  const [bio, setBio] = useState(member.bio ?? "");

  const handleSubmit = (e) => {
    e.preventDefault();
    onSave({
      name,
      birthDate: birthDate || null,
      deathDate: deathDate || null,
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
      <input
        type="date"
        value={deathDate}
        onChange={(e) => setDeathDate(e.target.value)}
        style={styles.input}
      />
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

function AddRelationshipForm({ currentMemberId, members, onSubmit, isPending }) {
  const [otherId, setOtherId] = useState("");
  const [type, setType] = useState("spouse");
  const others = members.filter((m) => m.id !== currentMemberId);

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!otherId) return;
    onSubmit({ memberAId: currentMemberId, memberBId: otherId, type });
    setOtherId("");
  };

  return (
    <form onSubmit={handleSubmit} style={styles.addRelForm}>
      <h4 style={styles.relsTitle}>Add relationship</h4>
      <select
        value={otherId}
        onChange={(e) => setOtherId(e.target.value)}
        required
        style={styles.input}
      >
        <option value="">Select person</option>
        {others.map((m) => (
          <option key={m.id} value={m.id}>{m.name}</option>
        ))}
      </select>
      <select value={type} onChange={(e) => setType(e.target.value)} style={styles.input}>
        <option value="parent">Parent</option>
        <option value="child">Child</option>
        <option value="spouse">Spouse</option>
        <option value="sibling">Sibling</option>
      </select>
      <button type="submit" disabled={isPending} style={styles.saveBtn}>
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
  editBtn: {
    display: "block",
    width: "100%",
    padding: 8,
    marginBottom: 16,
    background: "#f3f4f6",
    border: "none",
    borderRadius: 8,
    cursor: "pointer",
  },
  relsTitle: { margin: "0 0 8px", fontSize: 14 },
  addRelForm: { marginTop: 12, paddingTop: 12, borderTop: "1px solid #eee", display: "flex", flexDirection: "column", gap: 8 },
  muted: { margin: 0, fontSize: 13, color: "#6b7280" },
  relsList: { listStyle: "none", margin: 0, padding: 0 },
  relItem: { display: "flex", alignItems: "center", gap: 8, marginBottom: 6, fontSize: 14 },
  relType: { color: "#6b7280", textTransform: "capitalize" },
  removeRelBtn: { marginLeft: "auto", background: "none", border: "none", color: "#b91c1c", fontSize: 12 },
  form: { display: "flex", flexDirection: "column", gap: 10 },
  input: { padding: "10px 12px", border: "1px solid #d1d5db", borderRadius: 8, fontSize: 14 },
  formActions: { display: "flex", gap: 8, marginTop: 8 },
  cancelBtn: { padding: "8px 16px", background: "#f3f4f6", border: "none", borderRadius: 8, cursor: "pointer" },
  saveBtn: { padding: "8px 16px", background: "#1e3a5f", color: "#fff", border: "none", borderRadius: 8, cursor: "pointer" },
};
