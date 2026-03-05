import { useState, useContext } from "react";
import { Handle, Position } from "reactflow";
import { Ribbon, Plus, Baby, Heart } from "lucide-react";
import { isAliveSentinel } from "../../utils/memberDates";
import { TreeGraphSelectContext } from "./TreeGraphSelectContext";

const cardBase = {
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
  transition: "border-color 0.15s ease, box-shadow 0.15s ease",
};
const cardHover = {
  ...cardBase,
  borderColor: "#93c5fd",
  boxShadow: "0 2px 8px rgba(59, 130, 246, 0.2)",
};
/** @deprecated use cardBase/cardHover */
const card = cardBase;
const photoWrap = {
  position: "relative",
  flexShrink: 0,
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
  width: 44,
  height: 44,
  borderRadius: "50%",
  objectFit: "cover",
  background: "#f3f4f6",
};
const placeholder = {
  ...photo,
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  fontSize: 16,
  fontWeight: 600,
  color: "#9ca3af",
};
const name = {
  margin: 0,
  fontSize: 12,
  fontWeight: 500,
  color: "#374151",
  textAlign: "center",
  lineHeight: 1.2,
  maxWidth: 100,
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

export function MemberNode({ data, id: nodeId }) {
  const label = data?.label ?? "";
  const photoUrl = data?.photoUrl;
  const deceased = data?.deathDate != null && !isAliveSentinel(data.deathDate);
  const [hovered, setHovered] = useState(false);
  const [hoveredAction, setHoveredAction] = useState(null);
  const { onAddChild, onAddSpouse } = useContext(TreeGraphSelectContext) ?? {};
  const showActions = onAddChild || onAddSpouse;

  return (
    <>
      <Handle type="target" position={Position.Top} id="top-target" />
      <Handle type="source" position={Position.Top} id="top-source" />
      <Handle type="target" position={Position.Bottom} id="bottom-target" />
      <Handle type="source" position={Position.Bottom} id="bottom-source" />
      <div
        style={hovered ? cardHover : cardBase}
        onMouseEnter={() => setHovered(true)}
        onMouseLeave={() => setHovered(false)}
      >
        <div style={photoWrap}>
          {photoUrl ? (
            <img src={photoUrl} alt="" style={photo} />
          ) : (
            <span style={placeholder}>{label.charAt(0) || "?"}</span>
          )}
          {deceased && (
            <span style={ribbonWrap} title="Deceased" aria-hidden="true">
              <Ribbon size={18} color="#1f2937" strokeWidth={1.5} />
            </span>
          )}
        </div>
        <span style={name}>{label}</span>
        {showActions && (
          <div style={actionRow}>
            {onAddChild && (
              <button
                type="button"
                style={hoveredAction === "child" ? actionBtnHover : actionBtn}
                onClick={(e) => { e.stopPropagation(); onAddChild(nodeId); }}
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
                onClick={(e) => { e.stopPropagation(); onAddSpouse(nodeId); }}
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
