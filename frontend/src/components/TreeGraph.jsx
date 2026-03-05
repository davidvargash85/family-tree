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

import { getLayoutedElements } from "../utils/treeGraphLayout";
import { nodeTypes } from "./TreeGraph/nodeTypes";
import { TreeGraphSelectContext } from "./TreeGraph/TreeGraphSelectContext";

const emptyStateStyle = {
  padding: 40,
  textAlign: "center",
  color: "#6b7280",
};

const containerStyle = {
  width: "100%",
  height: "100%",
  minHeight: 400,
};

function TreeGraphInner({ members, relationships, onNodeClick }) {
  const { nodes: initialNodes, edges: initialEdges } = useMemo(
    () => getLayoutedElements(members, relationships),
    [members, relationships]
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
      onNodeClick?.(node.id, rect ?? null, { memberId });
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
    () => ({ onMemberSelect }),
    [onMemberSelect]
  );

  if (members.length === 0) {
    return <div style={emptyStateStyle}>Add members to see the tree</div>;
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
