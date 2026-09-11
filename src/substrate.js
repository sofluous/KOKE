// Shared object-space parameterization for the known radial rock.
export const TAU = Math.PI * 2;
export const clamp = (v, lo = 0, hi = 1) => Math.max(lo, Math.min(hi, v));
export const hash = (n) => { const v = Math.sin(n * 127.1 + 311.7) * 43758.5453; return v - Math.floor(v); };
export function noise(x, y, z) {
  const ix = Math.floor(x), iy = Math.floor(y), iz = Math.floor(z);
  const smooth = (t) => t * t * (3 - 2 * t);
  const fx = smooth(x - ix), fy = smooth(y - iy), fz = smooth(z - iz);
  const mix = (a, b, t) => a + (b - a) * t;
  const h = (a, b, c) => hash(a + b * 157 + c * 113);
  return mix(mix(mix(h(ix, iy, iz), h(ix + 1, iy, iz), fx), mix(h(ix, iy + 1, iz), h(ix + 1, iy + 1, iz), fx), fy),
    mix(mix(h(ix, iy, iz + 1), h(ix + 1, iy, iz + 1), fx), mix(h(ix, iy + 1, iz + 1), h(ix + 1, iy + 1, iz + 1), fx), fy), fz);
}
export function directionAt(u, v) {
  const longitude = (u - 0.5) * TAU, latitude = (v - 0.5) * Math.PI;
  return { x: Math.cos(latitude) * Math.cos(longitude), y: Math.sin(latitude), z: Math.cos(latitude) * Math.sin(longitude) };
}
export function uvAt(p) {
  const length = Math.hypot(p.x, p.y, p.z);
  if (!Number.isFinite(length) || length < 1e-8) throw new RangeError('Surface point must be finite and nonzero');
  return { u: (Math.atan2(p.z, p.x) / TAU + 1.5) % 1, v: 0.5 + Math.asin(clamp(p.y / length, -1, 1)) / Math.PI };
}
export function rockRadius(d) {
  const shape = 1 / Math.sqrt(d.x * d.x / 5.76 + d.y * d.y / 3.24 + d.z * d.z / 4.41);
  return shape * (0.85 + noise(d.x * 2.2 + 8, d.y * 2.2, d.z * 2.2) * 0.27 + Math.sin(d.y * 19 + d.x * 3 + d.z * 2) * 0.035);
}
export function sampleRock(u, v) {
  const d = directionAt(u, v), r = rockRadius(d), p = { x: d.x * r, y: d.y * r, z: d.z * r };
  const f = (x, y, z) => { const l = Math.hypot(x, y, z); return l - rockRadius({ x: x / l, y: y / l, z: z / l }); };
  const e = 0.002;
  const nx = f(p.x + e, p.y, p.z) - f(p.x - e, p.y, p.z);
  const ny = f(p.x, p.y + e, p.z) - f(p.x, p.y - e, p.z);
  const nz = f(p.x, p.y, p.z + e) - f(p.x, p.y, p.z - e);
  const nl = Math.hypot(nx, ny, nz);
  return { ...p, normal: { x: nx / nl, y: ny / nl, z: nz / nl }, heightNorm: clamp(p.y / 4 + 0.5) };
}
export function sampleSphere(u, v) {
  const d = directionAt(u, v);
  return { x: d.x * 2.2, y: d.y * 2.2, z: d.z * 2.2, normal: d, heightNorm: (d.y + 1) / 2 };
}

const phi = (1 + Math.sqrt(5)) / 2;
const icoVertices = [
  [-1,phi,0],[1,phi,0],[-1,-phi,0],[1,-phi,0],[0,-1,phi],[0,1,phi],
  [0,-1,-phi],[0,1,-phi],[phi,0,-1],[phi,0,1],[-phi,0,-1],[-phi,0,1],
].map(([x,y,z]) => { const l=Math.hypot(x,y,z); return {x:x/l,y:y/l,z:z/l}; });
const icoFaces = [
  [0,11,5],[0,5,1],[0,1,7],[0,7,10],[0,10,11],[1,5,9],[5,11,4],[11,10,2],[10,7,6],[7,1,8],
  [3,9,4],[3,4,2],[3,2,6],[3,6,8],[3,8,9],[4,9,5],[2,4,11],[6,2,10],[8,6,7],[9,8,1],
];
const icoPlanes = icoFaces.map(face => {
  const a=icoVertices[face[0]],b=icoVertices[face[1]],c=icoVertices[face[2]];
  const ab={x:b.x-a.x,y:b.y-a.y,z:b.z-a.z},ac={x:c.x-a.x,y:c.y-a.y,z:c.z-a.z};
  let n={x:ab.y*ac.z-ab.z*ac.y,y:ab.z*ac.x-ab.x*ac.z,z:ab.x*ac.y-ab.y*ac.x};
  const l=Math.hypot(n.x,n.y,n.z);n={x:n.x/l,y:n.y/l,z:n.z/l};
  if(n.x*a.x+n.y*a.y+n.z*a.z<0)n={x:-n.x,y:-n.y,z:-n.z};
  return {normal:n,d:n.x*a.x+n.y*a.y+n.z*a.z};
});
export function sampleIcosahedron(u,v) {
  const direction=directionAt(u,v);let distance=Infinity,normal=icoPlanes[0].normal;
  for(const plane of icoPlanes){const dot=plane.normal.x*direction.x+plane.normal.y*direction.y+plane.normal.z*direction.z;if(dot>1e-8){const t=plane.d/dot;if(t<distance){distance=t;normal=plane.normal;}}}
  const scale=2.35,distanceScaled=distance*scale;
  return {x:direction.x*distanceScaled,y:direction.y*distanceScaled,z:direction.z*distanceScaled,normal:{...normal},heightNorm:clamp(direction.y*distance/2+0.5)};
}

export const surfaceCatalog = Object.freeze({
  rock: { name: 'Rock', sample: sampleRock },
  sphere: { name: 'Sphere', sample: sampleSphere },
  icosahedron: { name: 'Icosahedron', sample: sampleIcosahedron },
});
