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

function getLayoutedElements(members, relationships) {
  const memberIds = new Set(members.map((m) => m.id));
  const rels = relationships.filter(
    (r) => memberIds.has(r.memberAId) && memberIds.has(r.memberBId)
  );
  const nodes = members.map((m, i) => ({
    id: m.id,
    type: "default",
    position: { x: (i % 4) * 220, y: Math.floor(i / 4) * 160 },
    data: { label: m.name, photoUrl: m.photoUrl },
  }));
  const edges = rels.map((r) => ({
    id: r.id,
    source: r.memberAId,
    target: r.memberBId,
    type: "smoothstep",
    label: r.type,
    markerEnd: { type: MarkerType.ArrowClosed },
  }));
  return { nodes, edges };
}

function TreeGraphInner({ members, relationships, onNodeClick }) {
  const { nodes: initialNodes, edges: initialEdges } = useMemo(
    () => getLayoutedElements(members, relationships),
    [members, relationships]
  );
  const [nodes, setNodes, onNodesChange] = useNodesState(initialNodes);
  const [edges, setEdges, onEdgesChange] = useEdgesState(initialEdges);

  useEffect(() => {
    setNodes(initialNodes);
    setEdges(initialEdges);
  }, [initialNodes, initialEdges, setNodes, setEdges]);

  const onNodeClickHandler = useCallback(
    (_, node) => onNodeClick?.(node.id),
    [onNodeClick]
  );

  if (members.length === 0) {
    return <div style={{ padding: 40, textAlign: "center", color: "#6b7280" }}>Add members to see the tree</div>;
  }

  return (
    <div style={{ width: "100%", height: "100%", minHeight: 400 }}>
      <ReactFlow
        nodes={nodes}
        edges={edges}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        onNodeClick={onNodeClickHandler}
        fitView
        attributionPosition="bottom-left"
      >
        <Background />
        <Controls />
        <MiniMap />
      </ReactFlow>
    </div>
  );
}

export default function TreeGraph(props) {
  return (
    <ReactFlowProvider>
      <TreeGraphInner {...props} />
    </ReactFlowProvider>
  );
}
