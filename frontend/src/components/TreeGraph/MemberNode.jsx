import { Handle, Position } from "reactflow";
import { Ribbon } from "lucide-react";
import { isAliveSentinel } from "../../utils/memberDates";

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
const ribbonWrap = {
  position: "absolute",
  top: 4,
  right: 4,
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

export function MemberNode({ data }) {
  const label = data?.label ?? "";
  const photoUrl = data?.photoUrl;
  const deceased = data?.deathDate != null && !isAliveSentinel(data.deathDate);

  return (
    <>
      <Handle type="target" position={Position.Top} id="top-target" />
      <Handle type="source" position={Position.Top} id="top-source" />
      <Handle type="target" position={Position.Bottom} id="bottom-target" />
      <Handle type="source" position={Position.Bottom} id="bottom-source" />
      <div style={card}>
        {deceased && (
          <span style={ribbonWrap} title="Deceased" aria-hidden="true">
            <Ribbon size={18} color="#1f2937" strokeWidth={2} />
          </span>
        )}
        {photoUrl ? (
          <img src={photoUrl} alt="" style={photo} />
        ) : (
          <span style={placeholder}>{label.charAt(0) || "?"}</span>
        )}
        <span style={name}>{label}</span>
      </div>
    </>
  );
}
