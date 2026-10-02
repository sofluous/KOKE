const clamp01=(value)=>Math.max(0,Math.min(1,value));

function randomFromSeed(seed) {
  let state=seed>>>0;
  return ()=>{state=(state+0x6d2b79f5)|0;let value=Math.imul(state^state>>>15,1|state);value=value+Math.imul(value^value>>>7,61|value)^value;return ((value^value>>>14)>>>0)/4294967296;};
}

function validateInput(positions,indices,maxTriangles) {
  if(!positions||positions.length<9||positions.length%3)throw new RangeError('Mesh positions must contain at least one triangle');
  if(!Array.from(positions).every(Number.isFinite))throw new RangeError('Mesh positions must be finite');
  const elementCount=indices?.length??positions.length/3;
  if(elementCount<3||elementCount%3)throw new RangeError('Mesh triangle indices are incomplete');
  const triangleCount=elementCount/3;
  if(triangleCount>maxTriangles)throw new RangeError(`Mesh exceeds the ${maxTriangles.toLocaleString()} triangle graph limit`);
  if(indices)for(const index of indices)if(!Number.isInteger(index)||index<0||index>=positions.length/3)throw new RangeError('Mesh index is outside the position buffer');
  return triangleCount;
}

function weldMesh(positions,indices,tolerance) {
  const vertices=[],lookup=new Map(),sourceToWelded=new Uint32Array(positions.length/3);
  for(let source=0;source<positions.length/3;source++){
    const x=positions[source*3],y=positions[source*3+1],z=positions[source*3+2];
    const key=`${Math.round(x/tolerance)},${Math.round(y/tolerance)},${Math.round(z/tolerance)}`;
    let welded=lookup.get(key);
    if(welded===undefined){welded=vertices.length/3;lookup.set(key,welded);vertices.push(x,y,z);}
    sourceToWelded[source]=welded;
  }
  const count=indices?.length??positions.length/3,triangles=new Uint32Array(count);
  for(let i=0;i<count;i++)triangles[i]=sourceToWelded[indices?indices[i]:i];
  return {vertices:new Float32Array(vertices),triangles};
}

function triangleData(vertices,triangles) {
  const triangleCount=triangles.length/3,centroids=new Float32Array(triangleCount*3),normals=new Float32Array(triangleCount*3),areas=new Float32Array(triangleCount);
  let totalArea=0,degenerateTriangleCount=0;
  for(let triangle=0;triangle<triangleCount;triangle++){
    const a=triangles[triangle*3]*3,b=triangles[triangle*3+1]*3,c=triangles[triangle*3+2]*3,j=triangle*3;
    const ax=vertices[a],ay=vertices[a+1],az=vertices[a+2],bx=vertices[b],by=vertices[b+1],bz=vertices[b+2],cx=vertices[c],cy=vertices[c+1],cz=vertices[c+2];
    centroids.set([(ax+bx+cx)/3,(ay+by+cy)/3,(az+bz+cz)/3],j);
    const abx=bx-ax,aby=by-ay,abz=bz-az,acx=cx-ax,acy=cy-ay,acz=cz-az;
    let nx=aby*acz-abz*acy,ny=abz*acx-abx*acz,nz=abx*acy-aby*acx;
    const crossLength=Math.hypot(nx,ny,nz),area=crossLength*0.5;areas[triangle]=area;totalArea+=area;
    if(crossLength<1e-10){degenerateTriangleCount++;nx=0;ny=1;nz=0;}else{nx/=crossLength;ny/=crossLength;nz/=crossLength;}
    normals.set([nx,ny,nz],j);
  }
  if(totalArea<1e-10)throw new RangeError('Mesh graph has no usable surface area');
  return {centroids,normals,areas,totalArea,degenerateTriangleCount};
}

function topology(triangles,triangleCount) {
  const edges=new Map(),neighborSets=Array.from({length:triangleCount},()=>new Set());
  for(let triangle=0;triangle<triangleCount;triangle++){
    const a=triangles[triangle*3],b=triangles[triangle*3+1],c=triangles[triangle*3+2];
    for(const [u,v] of [[a,b],[b,c],[c,a]]){
      const key=u<v?`${u}:${v}`:`${v}:${u}`;
      const list=edges.get(key);if(list)list.push(triangle);else edges.set(key,[triangle]);
    }
  }
  let boundaryEdgeCount=0,nonManifoldEdgeCount=0;
  for(const attached of edges.values()){
    if(attached.length===1)boundaryEdgeCount++;
    if(attached.length>2)nonManifoldEdgeCount++;
    for(let i=0;i<attached.length;i++)for(let j=i+1;j<attached.length;j++){neighborSets[attached[i]].add(attached[j]);neighborSets[attached[j]].add(attached[i]);}
  }
  const neighbors=neighborSets.map((set)=>Uint32Array.from([...set].sort((a,b)=>a-b)));
  const componentIds=new Uint32Array(triangleCount);componentIds.fill(0xffffffff);let componentCount=0;
  for(let start=0;start<triangleCount;start++)if(componentIds[start]===0xffffffff){
    const stack=[start];componentIds[start]=componentCount;
    while(stack.length){const current=stack.pop();for(const neighbor of neighbors[current])if(componentIds[neighbor]===0xffffffff){componentIds[neighbor]=componentCount;stack.push(neighbor);}}
    componentCount++;
  }
  return {neighbors,componentIds,componentCount,boundaryEdgeCount,nonManifoldEdgeCount};
}

export function createMeshSurfaceGraph(positions,{indices=null,weldTolerance=1e-5,maxTriangles=100_000}={}) {
  if(!Number.isFinite(weldTolerance)||weldTolerance<=0)throw new RangeError('Weld tolerance must be positive');
  if(!Number.isInteger(maxTriangles)||maxTriangles<1)throw new RangeError('Triangle graph limit must be positive');
  const triangleCount=validateInput(positions,indices,maxTriangles);
  const {vertices,triangles}=weldMesh(positions,indices,weldTolerance);
  const geometry=triangleData(vertices,triangles),links=topology(triangles,triangleCount);
  const cumulativeAreas=new Float64Array(triangleCount);let cumulative=0;
  for(let i=0;i<triangleCount;i++){cumulative+=geometry.areas[i];cumulativeAreas[i]=cumulative;}
  const pointAt=(triangle,barycentric={a:1/3,b:1/3,c:1/3})=>{
    if(!Number.isInteger(triangle)||triangle<0||triangle>=triangleCount)throw new RangeError('Unknown surface triangle');
    const weights=[barycentric.a,barycentric.b,barycentric.c];
    if(!weights.every(Number.isFinite)||weights.some((value)=>value<0)||Math.abs(weights[0]+weights[1]+weights[2]-1)>1e-5)throw new RangeError('Invalid barycentric surface location');
    const out={x:0,y:0,z:0},base=triangle*3;
    for(let corner=0;corner<3;corner++){const vertex=triangles[base+corner]*3;out.x+=vertices[vertex]*weights[corner];out.y+=vertices[vertex+1]*weights[corner];out.z+=vertices[vertex+2]*weights[corner];}
    return {...out,normal:{x:geometry.normals[base],y:geometry.normals[base+1],z:geometry.normals[base+2]},triangle,barycentric:{...barycentric},component:links.componentIds[triangle]};
  };
  const sample=(count,{seed=0}={})=>{
    if(!Number.isInteger(count)||count<0)throw new RangeError('Sample count must be nonnegative');
    if(!Number.isInteger(seed)||seed<0||seed>0xffffffff)throw new RangeError('Sample seed must be an unsigned integer');
    const random=randomFromSeed(seed),samples=[];
    for(let i=0;i<count;i++){
      const target=random()*geometry.totalArea;let low=0,high=triangleCount-1;
      while(low<high){const middle=(low+high)>>1;if(cumulativeAreas[middle]<target)low=middle+1;else high=middle;}
      const root=Math.sqrt(random()),a=1-root,b=root*(1-random()),c=1-a-b;
      samples.push(pointAt(low,{a,b,c}));
    }
    return samples;
  };
  return {vertices,triangles,triangleCount,vertexCount:vertices.length/3,...geometry,...links,pointAt,sample};
}

class MinHeap {
  constructor(){this.items=[];}
  push(item){let i=this.items.length;this.items.push(item);while(i){const parent=(i-1)>>1;if(this.items[parent].distance<=item.distance)break;this.items[i]=this.items[parent];i=parent;}this.items[i]=item;}
  pop(){if(!this.items.length)return null;const first=this.items[0],last=this.items.pop();if(this.items.length){let i=0;while(true){let child=i*2+1;if(child>=this.items.length)break;if(child+1<this.items.length&&this.items[child+1].distance<this.items[child].distance)child++;if(this.items[child].distance>=last.distance)break;this.items[i]=this.items[child];i=child;}this.items[i]=last;}return first;}
}

export class MeshSurfaceField {
  constructor(graph,{initialValue=0}={}) {
    if(!graph?.neighbors||!Number.isInteger(graph.triangleCount))throw new TypeError('A mesh surface graph is required');
    if(!Number.isFinite(initialValue)||initialValue<0||initialValue>1)throw new RangeError('Initial field value must be between zero and one');
    this.graph=graph;this.values=new Float32Array(graph.triangleCount);this.next=new Float32Array(graph.triangleCount);this.values.fill(initialValue);
  }
  paintFromTriangle(start,{radius=0.5,strength=1,erase=false}={}) {
    if(!Number.isInteger(start)||start<0||start>=this.graph.triangleCount)throw new RangeError('Unknown paint triangle');
    if(!Number.isFinite(radius)||radius<=0||!Number.isFinite(strength)||strength<0||strength>1)throw new RangeError('Invalid graph brush settings');
    const distances=new Float64Array(this.graph.triangleCount);distances.fill(Infinity);distances[start]=0;
    const heap=new MinHeap();heap.push({triangle:start,distance:0});let changed=0;
    while(heap.items.length){
      const current=heap.pop();if(current.distance!==distances[current.triangle]||current.distance>radius)continue;
      const influence=strength*(1-current.distance/radius),before=this.values[current.triangle];
      this.values[current.triangle]=erase?before*(1-influence):Math.min(1,before+influence*(1-before));
      if(Math.abs(this.values[current.triangle]-before)>1e-8)changed++;
      const a=current.triangle*3;
      for(const neighbor of this.graph.neighbors[current.triangle]){
        const b=neighbor*3,step=Math.hypot(this.graph.centroids[a]-this.graph.centroids[b],this.graph.centroids[a+1]-this.graph.centroids[b+1],this.graph.centroids[a+2]-this.graph.centroids[b+2]);
        const distance=current.distance+step;if(distance<distances[neighbor]&&distance<=radius){distances[neighbor]=distance;heap.push({triangle:neighbor,distance});}
      }
    }
    return changed;
  }
  step({diffusion=0.3,growth=0.1,decay=0,dt=0.05}={}) {
    for(const value of [diffusion,growth,decay,dt])if(!Number.isFinite(value)||value<0)throw new RangeError('Graph field rates must be nonnegative');
    for(let triangle=0;triangle<this.graph.triangleCount;triangle++){
      const neighbors=this.graph.neighbors[triangle],current=this.values[triangle];let mean=current;
      if(neighbors.length){mean=0;for(const neighbor of neighbors)mean+=this.values[neighbor];mean/=neighbors.length;}
      this.next[triangle]=clamp01(current+dt*((mean-current)*diffusion+current*(1-current)*growth-current*decay));
    }
    [this.values,this.next]=[this.next,this.values];return this.values;
  }
}
