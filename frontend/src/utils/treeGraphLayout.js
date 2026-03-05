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
 * Align levels for spouse/sibling: both members of a spouse or sibling pair
 * get the same level (the deeper one) so they display side-by-side.
 */
function alignSpouseSiblingLevels(levels, sameLevelRels) {
  const result = { ...levels };
  sameLevelRels.forEach((r) => {
    const a = result[r.memberAId];
    const b = result[r.memberBId];
    if (a === undefined || b === undefined) return;
    const same = Math.max(a, b);
    result[r.memberAId] = same;
    result[r.memberBId] = same;
  });
  return result;
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
 * Build spouse pairs from relationships. Returns Map: memberId -> partnerId (each member at most one partner).
 */
function buildSpousePairs(spouseRels) {
  const partnerMap = new Map();
  spouseRels.forEach((r) => {
    partnerMap.set(r.memberAId, r.memberBId);
    partnerMap.set(r.memberBId, r.memberAId);
  });
  return partnerMap;
}

/**
 * Get consistent couple key (sorted ids) so both members map to same couple.
 */
function coupleKey(id1, id2) {
  return [id1, id2].sort().join("-");
}

/**
 * Build entities per level: each entity is either one member (single) or a couple (two members).
 * Returns { entitiesByLevel: [{ level, entityIds: string[] }], memberToNodeId: Map, coupleData: Map }
 */
function buildEntitiesByLevel(members, levels, partnerMap) {
  const memberById = new Map(members.map((m) => [m.id, m]));
  const coupleData = new Map(); // coupleKey -> [member1, member2]
  const processedCouples = new Set();
  const memberToNodeId = new Map();
  const levelToEntityIds = {};

  members.forEach((m) => {
    const level = levels[m.id];
    if (!levelToEntityIds[level]) levelToEntityIds[level] = [];

    const partnerId = partnerMap.get(m.id);
    if (partnerId != null) {
      const key = coupleKey(m.id, partnerId);
      if (processedCouples.has(key)) return;
      processedCouples.add(key);
      const nodeId = `couple-${key}`;
      levelToEntityIds[level].push(nodeId);
      memberToNodeId.set(m.id, nodeId);
      memberToNodeId.set(partnerId, nodeId);
      const m1 = memberById.get(m.id);
      const m2 = memberById.get(partnerId);
      if (m1 && m2) coupleData.set(nodeId, [m1, m2]);
    } else {
      levelToEntityIds[level].push(m.id);
      memberToNodeId.set(m.id, m.id);
    }
  });

  const entitiesByLevel = Object.keys(levelToEntityIds)
    .map(Number)
    .sort((a, b) => a - b)
    .map((level) => ({ level, entityIds: levelToEntityIds[level] }));

  return { entitiesByLevel, memberToNodeId, coupleData };
}

/**
 * Compute x,y positions per entity; center each level.
 */
function computePositionsForEntities(entitiesByLevel, parentsMap, memberToNodeId) {
  const { NODE_WIDTH, NODE_HEIGHT, LEVEL_GAP, NODE_GAP } = LAYOUT;
  const positionByEntity = {};

  entitiesByLevel.forEach(({ level, entityIds }, levelIndex) => {
    const withPreferredX = entityIds.map((entityId) => {
      const memberIds = entityId.startsWith("couple-")
        ? entityId.slice(7).split("-")
        : [entityId];
      const parentNodeIds = [
        ...new Set(
          memberIds.flatMap((mid) => (parentsMap[mid] || []).map((p) => memberToNodeId.get(p)))
        ),
      ].filter(Boolean);
      const preferredX =
        parentNodeIds.length > 0
          ? parentNodeIds.reduce((s, nid) => s + (positionByEntity[nid]?.x ?? 0), 0) /
            parentNodeIds.length
          : (entityIds.indexOf(entityId) - (entityIds.length - 1) / 2) * (NODE_WIDTH + NODE_GAP);
      return { entityId, preferredX };
    });
    withPreferredX.sort((a, b) => a.preferredX - b.preferredX);
    const levelY = levelIndex * (NODE_HEIGHT + LEVEL_GAP);
    withPreferredX.forEach(({ entityId }, i) => {
      positionByEntity[entityId] = { x: i * (NODE_WIDTH + NODE_GAP), y: levelY };
    });
  });

  const maxXByLevel = {};
  entitiesByLevel.forEach(({ level, entityIds }) => {
    let maxX = 0;
    entityIds.forEach((id) => {
      const pos = positionByEntity[id];
      if (pos) maxX = Math.max(maxX, pos.x + NODE_WIDTH);
    });
    maxXByLevel[level] = maxX;
  });
  const maxTotalWidth = Math.max(0, ...Object.values(maxXByLevel).map((w) => w + NODE_GAP));

  entitiesByLevel.forEach(({ level, entityIds }) => {
    const levelWidth = maxXByLevel[level] - NODE_GAP;
    const offset = (maxTotalWidth - levelWidth - NODE_GAP) / 2;
    entityIds.forEach((id) => {
      if (positionByEntity[id]) positionByEntity[id].x += offset;
    });
  });

  return positionByEntity;
}

/** First name only (no last name) for display. */
function firstName(name) {
  if (!name || typeof name !== "string") return name ?? "";
  return name.trim().split(/\s+/)[0] || name;
}

/**
 * Build React Flow nodes and edges from members, relationships, and positions.
 * Couples are merged into one node; edges point to couple node when member is in a couple.
 */
export function getLayoutedElements(members, relationships) {
  const memberIds = new Set(members.map((m) => m.id));
  const rels = relationships.filter(
    (r) => memberIds.has(r.memberAId) && memberIds.has(r.memberBId)
  );
  const parentRels = rels.filter((r) => r.type === "parent");
  const spouseRels = rels.filter((r) => r.type === "spouse");
  const sameLevelRels = rels.filter((r) => r.type === "spouse" || r.type === "sibling");

  const { parentsMap } = buildParentMaps(members, parentRels);
  const levelsFromParent = assignLevels(members, parentsMap);
  const levels = alignSpouseSiblingLevels(levelsFromParent, sameLevelRels);
  const partnerMap = buildSpousePairs(spouseRels);
  const { entitiesByLevel, memberToNodeId, coupleData } = buildEntitiesByLevel(
    members,
    levels,
    partnerMap
  );
  const positionByEntity = computePositionsForEntities(
    entitiesByLevel,
    parentsMap,
    memberToNodeId
  );

  const nodes = [];
  entitiesByLevel.forEach(({ entityIds }) => {
    entityIds.forEach((entityId) => {
      const position = positionByEntity[entityId] || { x: 0, y: 0 };
      if (entityId.startsWith("couple-")) {
        const pair = coupleData.get(entityId);
        if (!pair || pair.length < 2) return;
        const [m1, m2] = pair;
        const title = `${firstName(m1.name)} & ${firstName(m2.name)}`;
        nodes.push({
          id: entityId,
          type: "couple",
          position,
          data: {
            title,
            memberIds: [m1.id, m2.id],
            members: [
              { id: m1.id, name: m1.name, photoUrl: m1.photoUrl, deathDate: m1.deathDate },
              { id: m2.id, name: m2.name, photoUrl: m2.photoUrl, deathDate: m2.deathDate },
            ],
          },
        });
      } else {
        const m = members.find((x) => x.id === entityId);
        if (!m) return;
        nodes.push({
          id: m.id,
          type: "member",
          position,
          data: {
            label: m.name,
            photoUrl: m.photoUrl,
            deathDate: m.deathDate,
          },
        });
      }
    });
  });

  const edges = [];
  rels.forEach((r) => {
    if (r.type === "spouse") {
      const n1 = memberToNodeId.get(r.memberAId);
      const n2 = memberToNodeId.get(r.memberBId);
      if (n1 === n2) return;
    }
    const sourceId = memberToNodeId.get(r.memberAId) ?? r.memberAId;
    const targetId = memberToNodeId.get(r.memberBId) ?? r.memberBId;
    const isParent = r.type === "parent";
    edges.push({
      id: r.id,
      source: sourceId,
      target: targetId,
      type: "smoothstep",
      label: isParent ? "" : r.type,
      sourceHandle: isParent ? "bottom-source" : "top-source",
      targetHandle: "top-target",
    });
  });

  return { nodes, edges };
}
