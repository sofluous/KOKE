function positionAt(attribute, index) {
  if (typeof attribute?.getX === 'function') {
    return [attribute.getX(index), attribute.getY(index), attribute.getZ(index)];
  }
  const itemSize = attribute?.itemSize ?? 3;
  const array = attribute?.array;
  if (!array || itemSize < 3) throw new TypeError('Geometry position attribute is incomplete');
  const offset = index * itemSize;
  return [array[offset], array[offset + 1], array[offset + 2]];
}

function indexAt(indexAttribute, offset) {
  if (!indexAttribute) return offset;
  if (typeof indexAttribute.getX === 'function') return indexAttribute.getX(offset);
  if (!indexAttribute.array) throw new TypeError('Geometry index attribute is incomplete');
  return indexAttribute.array[offset];
}

function validateGraph(graph) {
  if (!graph || !Number.isInteger(graph.triangleCount) || !graph.vertices || !graph.triangles || !graph.componentIds) {
    throw new TypeError('A mesh surface graph is required');
  }
}

function samePoint(a, b, tolerance) {
  return Math.abs(a[0] - b[0]) <= tolerance
    && Math.abs(a[1] - b[1]) <= tolerance
    && Math.abs(a[2] - b[2]) <= tolerance;
}

export function validateMeshGraphGeometry(geometry, graph, { tolerance = 1e-5 } = {}) {
  validateGraph(graph);
  if (!Number.isFinite(tolerance) || tolerance <= 0) throw new RangeError('Collision tolerance must be positive');
  const position = geometry?.attributes?.position;
  if (!position) throw new TypeError('Collision geometry requires positions');
  const index = geometry.index;
  const elementCount = index?.count ?? index?.array?.length ?? position.count ?? position.array?.length / (position.itemSize ?? 3);
  if (!Number.isInteger(elementCount) || elementCount % 3) throw new RangeError('Collision geometry has incomplete triangles');
  const faceCount = elementCount / 3;
  if (faceCount !== graph.triangleCount) throw new RangeError('Collision geometry face count does not match the mesh graph');

  for (let triangle = 0; triangle < faceCount; triangle += 1) {
    for (let corner = 0; corner < 3; corner += 1) {
      const geometryVertex = indexAt(index, triangle * 3 + corner);
      const graphVertex = graph.triangles[triangle * 3 + corner];
      const source = positionAt(position, geometryVertex);
      const welded = positionAt({ array: graph.vertices, itemSize: 3 }, graphVertex);
      if (!source.every(Number.isFinite) || !samePoint(source, welded, tolerance)) {
        throw new RangeError(`Collision geometry face order diverges at triangle ${triangle}`);
      }
    }
  }
  return { faceCount, indexed: Boolean(index), tolerance };
}

function barycentricAt(graph, triangle, point) {
  const base = triangle * 3;
  const ia = graph.triangles[base] * 3;
  const ib = graph.triangles[base + 1] * 3;
  const ic = graph.triangles[base + 2] * 3;
  const ax = graph.vertices[ia], ay = graph.vertices[ia + 1], az = graph.vertices[ia + 2];
  const v0x = graph.vertices[ib] - ax, v0y = graph.vertices[ib + 1] - ay, v0z = graph.vertices[ib + 2] - az;
  const v1x = graph.vertices[ic] - ax, v1y = graph.vertices[ic + 1] - ay, v1z = graph.vertices[ic + 2] - az;
  const v2x = point.x - ax, v2y = point.y - ay, v2z = point.z - az;
  const d00 = v0x * v0x + v0y * v0y + v0z * v0z;
  const d01 = v0x * v1x + v0y * v1y + v0z * v1z;
  const d11 = v1x * v1x + v1y * v1y + v1z * v1z;
  const d20 = v2x * v0x + v2y * v0y + v2z * v0z;
  const d21 = v2x * v1x + v2y * v1y + v2z * v1z;
  const denominator = d00 * d11 - d01 * d01;
  if (!Number.isFinite(denominator) || Math.abs(denominator) < 1e-14) throw new RangeError('Cannot resolve a degenerate collision face');
  const b = (d11 * d20 - d01 * d21) / denominator;
  const c = (d00 * d21 - d01 * d20) / denominator;
  const a = 1 - b - c;
  const epsilon = 1e-4;
  if (a < -epsilon || b < -epsilon || c < -epsilon || a > 1 + epsilon || b > 1 + epsilon || c > 1 + epsilon) {
    throw new RangeError('Collision point lies outside its reported face');
  }
  const clamped = [Math.max(0, a), Math.max(0, b), Math.max(0, c)];
  const sum = clamped[0] + clamped[1] + clamped[2];
  return { a: clamped[0] / sum, b: clamped[1] / sum, c: clamped[2] / sum };
}

function plainPoint(point) {
  return { x: point.x, y: point.y, z: point.z };
}

export function createMeshCollisionAdapter(mesh, graph, options = {}) {
  if (!mesh?.geometry || typeof mesh.worldToLocal !== 'function') throw new TypeError('A transformable collision mesh is required');
  const validation = validateMeshGraphGeometry(mesh.geometry, graph, options);

  function resolveHit(hit) {
    if (!hit) return null;
    if (hit.object && hit.object !== mesh) throw new TypeError('Raycast hit belongs to another mesh');
    if (!Number.isInteger(hit.faceIndex) || hit.faceIndex < 0 || hit.faceIndex >= graph.triangleCount) {
      throw new RangeError('Raycast hit has no valid face index');
    }
    if (!hit.point || typeof hit.point.clone !== 'function') throw new TypeError('Raycast hit requires a world point');
    const worldPoint = plainPoint(hit.point);
    const localVector = mesh.worldToLocal(hit.point.clone());
    const barycentric = barycentricAt(graph, hit.faceIndex, localVector);
    const location = graph.pointAt(hit.faceIndex, barycentric);
    return {
      faceIndex: hit.faceIndex,
      triangle: hit.faceIndex,
      component: location.component,
      barycentric,
      point: { x: location.x, y: location.y, z: location.z },
      worldPoint,
      normal: location.normal,
      distance: Number.isFinite(hit.distance) ? hit.distance : null,
    };
  }

  function raycast(raycaster, recursive = false) {
    if (!raycaster || typeof raycaster.intersectObject !== 'function') throw new TypeError('A Three.js-compatible raycaster is required');
    const hits = raycaster.intersectObject(mesh, Boolean(recursive));
    return hits.length ? resolveHit(hits[0]) : null;
  }

  function paintHit(simulation, hit, brush = {}) {
    if (!simulation || typeof simulation.paintFromFace !== 'function') throw new TypeError('A graph simulation with face painting is required');
    const collision = resolveHit(hit);
    return collision ? { collision, changed: simulation.paintFromFace(collision.faceIndex, brush) } : null;
  }

  return { mesh, graph, validation, resolveHit, raycast, paintHit };
}

function triangleBounds(graph, triangle) {
  const min = [Infinity, Infinity, Infinity], max = [-Infinity, -Infinity, -Infinity];
  for (let corner = 0; corner < 3; corner += 1) {
    const vertex = graph.triangles[triangle * 3 + corner] * 3;
    for (let axis = 0; axis < 3; axis += 1) {
      const value = graph.vertices[vertex + axis]; min[axis] = Math.min(min[axis], value); max[axis] = Math.max(max[axis], value);
    }
  }
  return { min, max };
}

function segmentIntersectsBounds(from, direction, bounds, maximum) {
  let near = 0, far = maximum;
  for (const axis of ['x', 'y', 'z']) {
    const index = axis === 'x' ? 0 : axis === 'y' ? 1 : 2;
    const origin = from[axis], delta = direction[axis];
    if (Math.abs(delta) < 1e-12) { if (origin < bounds.min[index] || origin > bounds.max[index]) return false; continue; }
    let a = (bounds.min[index] - origin) / delta, b = (bounds.max[index] - origin) / delta;
    if (a > b) [a, b] = [b, a]; near = Math.max(near, a); far = Math.min(far, b); if (near > far) return false;
  }
  return true;
}

function segmentTriangle(graph, triangle, from, direction, maximum) {
  const base = triangle * 3, ia = graph.triangles[base] * 3, ib = graph.triangles[base + 1] * 3, ic = graph.triangles[base + 2] * 3;
  const ax = graph.vertices[ia], ay = graph.vertices[ia + 1], az = graph.vertices[ia + 2];
  const e1x = graph.vertices[ib] - ax, e1y = graph.vertices[ib + 1] - ay, e1z = graph.vertices[ib + 2] - az;
  const e2x = graph.vertices[ic] - ax, e2y = graph.vertices[ic + 1] - ay, e2z = graph.vertices[ic + 2] - az;
  const hx = direction.y * e2z - direction.z * e2y, hy = direction.z * e2x - direction.x * e2z, hz = direction.x * e2y - direction.y * e2x;
  const determinant = e1x * hx + e1y * hy + e1z * hz;
  if (Math.abs(determinant) < 1e-12) return null;
  const inverse = 1 / determinant, sx = from.x - ax, sy = from.y - ay, sz = from.z - az;
  const b = (sx * hx + sy * hy + sz * hz) * inverse; if (b < 0 || b > 1) return null;
  const qx = sy * e1z - sz * e1y, qy = sz * e1x - sx * e1z, qz = sx * e1y - sy * e1x;
  const c = (direction.x * qx + direction.y * qy + direction.z * qz) * inverse; if (c < 0 || b + c > 1) return null;
  const distance = (e2x * qx + e2y * qy + e2z * qz) * inverse;
  if (distance < 1e-7 || distance > maximum) return null;
  return { distance, barycentric: { a: 1 - b - c, b, c } };
}

export function createMeshSegmentCollider(graph, { leafSize = 12 } = {}) {
  validateGraph(graph);
  if (!Number.isInteger(leafSize) || leafSize < 2 || leafSize > 64) throw new RangeError('Collision leaf size must be between 2 and 64');
  const bounds = Array.from({ length: graph.triangleCount }, (_, triangle) => triangleBounds(graph, triangle));
  const build = (triangles) => {
    const nodeBounds = { min: [Infinity, Infinity, Infinity], max: [-Infinity, -Infinity, -Infinity] };
    for (const triangle of triangles) for (let axis = 0; axis < 3; axis += 1) {
      nodeBounds.min[axis] = Math.min(nodeBounds.min[axis], bounds[triangle].min[axis]);
      nodeBounds.max[axis] = Math.max(nodeBounds.max[axis], bounds[triangle].max[axis]);
    }
    if (triangles.length <= leafSize) return { bounds: nodeBounds, triangles };
    const extents = nodeBounds.max.map((value, axis) => value - nodeBounds.min[axis]);
    const axis = extents[1] > extents[0] ? (extents[2] > extents[1] ? 2 : 1) : (extents[2] > extents[0] ? 2 : 0);
    triangles.sort((a, b) => graph.centroids[a * 3 + axis] - graph.centroids[b * 3 + axis]);
    const middle = triangles.length >> 1;
    return { bounds: nodeBounds, left: build(triangles.slice(0, middle)), right: build(triangles.slice(middle)) };
  };
  const root = build(Array.from({ length: graph.triangleCount }, (_, triangle) => triangle));
  function castSegment(from, to) {
    if (![from?.x, from?.y, from?.z, to?.x, to?.y, to?.z].every(Number.isFinite)) throw new TypeError('Finite segment endpoints are required');
    const direction = { x: to.x - from.x, y: to.y - from.y, z: to.z - from.z };
    const length = Math.hypot(direction.x, direction.y, direction.z); if (length < 1e-10) return null;
    direction.x /= length; direction.y /= length; direction.z /= length;
    let nearest = length, match = null; const stack = [root];
    while (stack.length) {
      const node = stack.pop(); if (!segmentIntersectsBounds(from, direction, node.bounds, nearest)) continue;
      if (node.triangles) for (const triangle of node.triangles) {
        const hit = segmentTriangle(graph, triangle, from, direction, nearest);
        if (hit) { nearest = hit.distance; match = { triangle, ...hit }; }
      } else { stack.push(node.left, node.right); }
    }
    if (!match) return null;
    const location = graph.pointAt(match.triangle, match.barycentric);
    return { ...location, faceIndex: match.triangle, distance: match.distance };
  }
  return { graph, leafSize, castSegment };
}
