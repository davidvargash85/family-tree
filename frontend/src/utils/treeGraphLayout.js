/**
 * Family tree layout: assigns levels (generations) and x,y positions so that
 * parents appear above children and spouse/sibling edges connect at the same level.
 */

export const LAYOUT = {
  NODE_WIDTH: 160,
  NODE_HEIGHT: 72,
  LEVEL_GAP: 120,
  NODE_GAP: 24,
};

/**
 * Build parent/child maps from "parent" type relationships (memberA = parent, memberB = child).
 */
function buildParentMaps(members, parentRels) {
  const parentsMap = {};
  const childrenMap = {};
  parentRels.forEach((r) => {
    parentsMap[r.memberBId] = (parentsMap[r.memberBId] || []).concat(r.memberAId);
    childrenMap[r.memberAId] = (childrenMap[r.memberAId] || []).concat(r.memberBId);
  });
  return { parentsMap, childrenMap };
}

/**
 * Assign level (generation) to each member: 0 = root, 1 = children of roots, etc.
 */
function assignLevels(members, parentsMap) {
  const levels = {};
  const roots = members.filter((m) => !parentsMap[m.id]?.length);
  roots.forEach((m) => (levels[m.id] = 0));
  let remaining = members.filter((m) => levels[m.id] === undefined);
  while (remaining.length) {
    let updated = false;
    for (const m of remaining) {
      const parents = parentsMap[m.id] || [];
      if (parents.every((p) => levels[p] !== undefined)) {
        levels[m.id] = 1 + Math.max(...parents.map((p) => levels[p]));
        updated = true;
      }
    }
    remaining = remaining.filter((m) => levels[m.id] === undefined);
    if (!updated) break;
  }
  remaining.forEach((m) => (levels[m.id] = levels[m.id] ?? 0));
  return levels;
}

/**
 * Group member ids by level and sort levels.
 */
function groupByLevel(members, levels) {
  const levelToIds = {};
  members.forEach((m) => {
    const l = levels[m.id];
    if (!levelToIds[l]) levelToIds[l] = [];
    levelToIds[l].push(m.id);
  });
  return Object.keys(levelToIds)
    .map(Number)
    .sort((a, b) => a - b)
    .map((level) => ({ level, ids: levelToIds[level] }));
}

/**
 * Compute x,y positions per node; center each level relative to the widest level.
 */
function computePositions(sortedLevels, parentsMap) {
  const { NODE_WIDTH, NODE_HEIGHT, LEVEL_GAP, NODE_GAP } = LAYOUT;
  const positionByNode = {};

  sortedLevels.forEach(({ level, ids }, levelIndex) => {
    const withPreferredX = ids.map((id) => {
      const parents = parentsMap[id] || [];
      const preferredX =
        parents.length > 0
          ? parents.reduce((s, p) => s + (positionByNode[p]?.x ?? 0), 0) / parents.length
          : (ids.indexOf(id) - (ids.length - 1) / 2) * (NODE_WIDTH + NODE_GAP);
      return { id, preferredX };
    });
    withPreferredX.sort((a, b) => a.preferredX - b.preferredX);
    const levelY = levelIndex * (NODE_HEIGHT + LEVEL_GAP);
    withPreferredX.forEach(({ id }, i) => {
      positionByNode[id] = { x: i * (NODE_WIDTH + NODE_GAP), y: levelY };
    });
  });

  const maxXByLevel = {};
  sortedLevels.forEach(({ level, ids }) => {
    let maxX = 0;
    ids.forEach((id) => {
      const pos = positionByNode[id];
      if (pos) maxX = Math.max(maxX, pos.x + NODE_WIDTH);
    });
    maxXByLevel[level] = maxX;
  });
  const maxTotalWidth = Math.max(0, ...Object.values(maxXByLevel).map((w) => w + NODE_GAP));

  sortedLevels.forEach(({ level, ids }) => {
    const levelWidth = maxXByLevel[level] - NODE_GAP;
    const offset = (maxTotalWidth - levelWidth - NODE_GAP) / 2;
    ids.forEach((id) => {
      if (positionByNode[id]) positionByNode[id].x += offset;
    });
  });

  return positionByNode;
}

/**
 * Build React Flow nodes and edges from members, relationships, and positions.
 * Edge handles: parent→child use bottom→top; spouse/sibling use top→top.
 */
export function getLayoutedElements(members, relationships) {
  const memberIds = new Set(members.map((m) => m.id));
  const rels = relationships.filter(
    (r) => memberIds.has(r.memberAId) && memberIds.has(r.memberBId)
  );
  const parentRels = rels.filter((r) => r.type === "parent");

  const { parentsMap } = buildParentMaps(members, parentRels);
  const levels = assignLevels(members, parentsMap);
  const sortedLevels = groupByLevel(members, levels);
  const positionByNode = computePositions(sortedLevels, parentsMap);

  const nodes = members.map((m) => ({
    id: m.id,
    type: "member",
    position: positionByNode[m.id] || { x: 0, y: 0 },
    data: { label: m.name, photoUrl: m.photoUrl, deathDate: m.deathDate },
  }));

  const edges = rels.map((r) => {
    const isParent = r.type === "parent";
    return {
      id: r.id,
      source: r.memberAId,
      target: r.memberBId,
      type: "smoothstep",
      label: isParent ? "" : r.type,
      sourceHandle: isParent ? "bottom-source" : "top-source",
      targetHandle: "top-target",
    };
  });

  return { nodes, edges };
}
