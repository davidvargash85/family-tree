import { useContext, useCallback, useState } from "react";
import { Handle, Position } from "reactflow";
import { Ribbon, Plus, Baby, Heart } from "lucide-react";
import { isAliveSentinel } from "../../utils/memberDates";
import { TreeGraphSelectContext } from "./TreeGraphSelectContext";

const card = {
  padding: 10,
  borderRadius: 10,
  background: "#fff",
  border: "1px solid #e5e7eb",
  boxShadow: "0 1px 3px rgba(0,0,0,0.08)",
  display: "flex",
  flexDirection: "column",
  alignItems: "center",
  gap: 6,
  minWidth: 80,
  position: "relative",
};
const thumbnailsRow = {
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  gap: 4,
  flexShrink: 0,
};
const photoWrap = {
  position: "relative",
  flexShrink: 0,
};
const thumbButtonBase = {
  padding: 0,
  border: "none",
  background: "none",
  cursor: "pointer",
  borderRadius: "50%",
  display: "block",
  position: "relative",
  flexShrink: 0,
  transition: "background-color 0.15s ease, transform 0.15s ease",
};
const thumbButtonHover = {
  ...thumbButtonBase,
  backgroundColor: "rgba(59, 130, 246, 0.12)",
  transform: "scale(1.08)",
};
const ribbonWrap = {
  position: "absolute",
  bottom: -2,
  right: -2,
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
};
const photo = {
  width: 40,
  height: 40,
  borderRadius: "50%",
  objectFit: "cover",
  background: "#f3f4f6",
};
const placeholder = {
  ...photo,
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  fontSize: 14,
  fontWeight: 600,
  color: "#9ca3af",
};
const title = {
  margin: 0,
  fontSize: 12,
  fontWeight: 500,
  color: "#374151",
  textAlign: "center",
  lineHeight: 1.2,
  maxWidth: 120,
  overflow: "hidden",
  textOverflow: "ellipsis",
  whiteSpace: "nowrap",
};
const actionRow = {
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  gap: 4,
};
const actionBtn = {
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
};
const actionBtnHover = {
  ...actionBtn,
  backgroundColor: "rgba(59, 130, 246, 0.12)",
  color: "#2563eb",
};

function Thumb({ member, onClick, hovered, onHoverChange }) {
  const deceased = member?.deathDate != null && !isAliveSentinel(member.deathDate);
  const name = member?.name ?? "";
  const photoUrl = member?.photoUrl;

  const content = (
    <div style={photoWrap}>
      {photoUrl ? (
        <img src={photoUrl} alt="" style={photo} />
      ) : (
        <span style={placeholder}>{name.charAt(0) || "?"}</span>
      )}
      {deceased && (
        <span style={ribbonWrap} title="Deceased" aria-hidden="true">
          <Ribbon size={14} color="#1f2937" fill="#1f2937" strokeWidth={1.5} />
        </span>
      )}
    </div>
  );

  if (onClick) {
    return (
      <button
        type="button"
        style={hovered ? thumbButtonHover : thumbButtonBase}
        onClick={onClick}
        onMouseEnter={() => onHoverChange?.(true)}
        onMouseLeave={() => onHoverChange?.(false)}
        title={name || "View"}
        aria-label={name ? `View ${name}` : "View member"}
      >
        {content}
      </button>
    );
  }
  return content;
}

export function CoupleNode({ data }) {
  const titleText = data?.title ?? "";
  const members = data?.members ?? [];
  const { onMemberSelect, onAddChild, onAddSpouse } = useContext(TreeGraphSelectContext) ?? {};
  const [hoveredIndex, setHoveredIndex] = useState(null);
  const [hoveredAction, setHoveredAction] = useState(null);
  const primaryMemberId = members[0]?.id ?? null;
  const showActions = (onAddChild || onAddSpouse) && primaryMemberId;

  const handleThumbClick = useCallback(
    (memberId) => (event) => {
      event.stopPropagation();
      const rect = event.currentTarget.getBoundingClientRect();
      onMemberSelect?.(memberId, rect);
    },
    [onMemberSelect]
  );

  return (
    <>
      <Handle type="target" position={Position.Top} id="top-target" />
      <Handle type="source" position={Position.Top} id="top-source" />
      <Handle type="target" position={Position.Bottom} id="bottom-target" />
      <Handle type="source" position={Position.Bottom} id="bottom-source" />
      <div style={card}>
        <div style={thumbnailsRow}>
          {members.length >= 1 && (
            <Thumb
              member={members[0]}
              onClick={members[0]?.id ? handleThumbClick(members[0].id) : undefined}
              hovered={hoveredIndex === 0}
              onHoverChange={(v) => setHoveredIndex(v ? 0 : null)}
            />
          )}
          {members.length >= 2 && (
            <Thumb
              member={members[1]}
              onClick={members[1]?.id ? handleThumbClick(members[1].id) : undefined}
              hovered={hoveredIndex === 1}
              onHoverChange={(v) => setHoveredIndex(v ? 1 : null)}
            />
          )}
        </div>
        <span style={title}>{titleText}</span>
        {showActions && (
          <div style={actionRow}>
            {onAddChild && (
              <button
                type="button"
                style={hoveredAction === "child" ? actionBtnHover : actionBtn}
                onClick={(e) => { e.stopPropagation(); onAddChild(primaryMemberId); }}
                onMouseEnter={() => setHoveredAction("child")}
                onMouseLeave={() => setHoveredAction(null)}
                title="Add child"
                aria-label="Add child"
              >
                <Plus size={12} strokeWidth={2.5} />
                <Baby size={14} style={{ marginLeft: 1 }} />
              </button>
            )}
            {onAddSpouse && (
              <button
                type="button"
                style={hoveredAction === "spouse" ? actionBtnHover : actionBtn}
                onClick={(e) => { e.stopPropagation(); onAddSpouse(primaryMemberId); }}
                onMouseEnter={() => setHoveredAction("spouse")}
                onMouseLeave={() => setHoveredAction(null)}
                title="Add spouse"
                aria-label="Add spouse"
              >
                <Plus size={12} strokeWidth={2.5} />
                <Heart size={14} style={{ marginLeft: 1 }} />
              </button>
            )}
          </div>
        )}
      </div>
    </>
  );
}
