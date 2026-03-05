/**
 * Count descendants of a member using parent relationships (memberA = parent, memberB = child).
 */
export function countDescendants(relationships, memberId) {
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
