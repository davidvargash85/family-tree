import { useCallback, useMemo, useEffect } from "react";
import ReactFlow, {
  MiniMap,
  Controls,
  Background,
  useNodesState,
  useEdgesState,
  MarkerType,
  ReactFlowProvider,
} from "reactflow";
import "reactflow/dist/style.css";

import { nodeTypes } from "./TreeGraph/nodeTypes";
import { TreeGraphSelectContext } from "./TreeGraph/TreeGraphSelectContext";
import { Button } from "./ui/Button";

const emptyStateStyle = {
  padding: 40,
  textAlign: "center",
  color: "#6b7280",
};

const emptyStateCardStyle = {
  padding: "48px 32px",
  textAlign: "center",
  maxWidth: 360,
  margin: "auto",
};
const emptyStateHeadlineStyle = {
  fontSize: "1.25rem",
  fontWeight: 600,
  color: "#1e293b",
  margin: "0 0 8px",
};
const emptyStateSublineStyle = {
  fontSize: "0.9375rem",
  color: "#64748b",
  margin: "0 0 24px",
  lineHeight: 1.45,
};

const containerStyle = {
  width: "100%",
  height: "100%",
  minHeight: 400,
};

function nodeToMemberInfo(node) {
  if (!node) return { memberId: null, name: "" };
  if (node.type === "couple" && node.data?.members?.[0]) {
    const m = node.data.members[0];
    return { memberId: m.id, name: m.name ?? "" };
  }
  return { memberId: node.id, name: node.data?.label ?? "" };
}

function TreeGraphInner({
  members,
  relationships,
  layoutFromApi,
  onLayoutSave,
  onNodeClick,
  onConnectionRequest,
  onAddChild,
  onAddSpouse,
  onDelete,
  onAddFirstMember,
}) {
  const initialNodes = useMemo(
    () => layoutFromApi?.nodes ?? [],
    [layoutFromApi?.nodes]
  );
  const initialEdges = useMemo(
    () => layoutFromApi?.edges ?? [],
    [layoutFromApi?.edges]
  );

  const edgesWithMarker = useMemo(
    () =>
      initialEdges.map((e) => ({
        ...e,
        markerEnd: { type: MarkerType.ArrowClosed },
      })),
    [initialEdges]
  );

  const [nodes, setNodes, onNodesChange] = useNodesState(initialNodes);
  const [edges, setEdges, onEdgesChange] = useEdgesState(edgesWithMarker);

  useEffect(() => {
    setNodes(initialNodes);
    setEdges(
      initialEdges.map((e) => ({ ...e, markerEnd: { type: MarkerType.ArrowClosed } }))
    );
  }, [initialNodes, initialEdges, setNodes, setEdges]);

  const onNodeClickHandler = useCallback(
    (event, node) => {
      const rect = event?.currentTarget?.getBoundingClientRect?.();
      const memberId =
        node.type === "couple" && node.data?.members?.[0]?.id
          ? node.data.members[0].id
          : node.id;
      const memberIds =
        node.type === "couple" && node.data?.memberIds?.length >= 2
          ? node.data.memberIds
          : [node.id];
      onNodeClick?.(node.id, rect ?? null, { memberId, memberIds });
    },
    [onNodeClick]
  );

  const onMemberSelect = useCallback(
    (memberId, rect) => {
      onNodeClick?.(memberId, rect ?? null, { memberId });
    },
    [onNodeClick]
  );

  const selectContextValue = useMemo(
    () => ({
      onMemberSelect,
      onAddChild: onAddChild ?? undefined,
      onAddSpouse: onAddSpouse ?? undefined,
      onDelete: onDelete ?? undefined,
    }),
    [onMemberSelect, onAddChild, onAddSpouse, onDelete]
  );

  const onConnect = useCallback(
    (connection) => {
      if (!onConnectionRequest || !connection?.source || !connection?.target) return;
      const sourceNode = nodes.find((n) => n.id === connection.source);
      const targetNode = nodes.find((n) => n.id === connection.target);
      const sourceInfo = nodeToMemberInfo(sourceNode);
      const targetInfo = nodeToMemberInfo(targetNode);
      if (sourceInfo.memberId && targetInfo.memberId && sourceInfo.memberId !== targetInfo.memberId) {
        onConnectionRequest({
          sourceMemberId: sourceInfo.memberId,
          targetMemberId: targetInfo.memberId,
          sourceName: sourceInfo.name,
          targetName: targetInfo.name,
        });
      }
    },
    [nodes, onConnectionRequest]
  );

  const onNodeDragStop = useCallback(
    (_event, draggedNode) => {
      if (!onLayoutSave) return;
      const positions = {};
      nodes.forEach((n) => {
        const pos = n.id === draggedNode?.id ? draggedNode.position : n.position;
        if (n.id && typeof pos?.x === "number" && typeof pos?.y === "number") {
          positions[n.id] = { x: pos.x, y: pos.y };
        }
      });
      onLayoutSave(positions);
    },
    [onLayoutSave, nodes]
  );

  if (members.length === 0) {
    return (
      <div style={{ ...emptyStateStyle, display: "flex", alignItems: "center", justifyContent: "center", minHeight: 400 }}>
        <div style={emptyStateCardStyle}>
          <p style={emptyStateHeadlineStyle}>Let’s get your family started</p>
          <p style={emptyStateSublineStyle}>
            Every tree begins with one. Add yourself, a parent, or that legendary great-great-great grandparent.
          </p>
          {onAddFirstMember ? (
            <Button variant="primary" onClick={onAddFirstMember}>
              Add first member
            </Button>
          ) : (
            <p style={emptyStateSublineStyle}>Add members to see the tree.</p>
          )}
        </div>
      </div>
    );
  }
  if (layoutFromApi == null && initialNodes.length === 0) {
    return <div style={emptyStateStyle}>Loading layout…</div>;
  }

  return (
    <TreeGraphSelectContext.Provider value={selectContextValue}>
      <div style={containerStyle}>
        <ReactFlow
        nodes={nodes}
        edges={edges}
        nodeTypes={nodeTypes}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        onNodeClick={onNodeClickHandler}
        onNodeDragStop={onNodeDragStop}
        onConnect={onConnect}
        fitView
        attributionPosition="bottom-left"
      >
        <Background />
        <Controls />
        <MiniMap />
      </ReactFlow>
    </div>
    </TreeGraphSelectContext.Provider>
  );
}

export default function TreeGraph(props) {
  return (
    <ReactFlowProvider>
      <TreeGraphInner {...props} />
    </ReactFlowProvider>
  );
}
