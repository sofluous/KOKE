import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { createRadialSurface } from './radial-surface.js';

const MAX_TRIANGLES=10_000;

function parseGlb(loader,buffer) {
  return new Promise((resolve,reject)=>loader.parse(buffer,'',resolve,reject));
}

export async function importRadialGlb(THREE,file) {
  if(!(file instanceof File)||!file.name.toLowerCase().endsWith('.glb'))throw new TypeError('Choose a self-contained .glb file');
  const gltf=await parseGlb(new GLTFLoader(),await file.arrayBuffer());
  gltf.scene.updateMatrixWorld(true);
  const values=[],point=new THREE.Vector3();let triangleCount=0;
  gltf.scene.traverse(node=>{
    if(!node.isMesh||!node.geometry?.attributes?.position)return;
    const position=node.geometry.attributes.position,index=node.geometry.index;
    const count=index?index.count:position.count;
    triangleCount+=Math.floor(count/3);
    if(triangleCount>MAX_TRIANGLES)return;
    for(let i=0;i<count;i++){
      const vertex=index?index.getX(i):i;
      point.fromBufferAttribute(position,vertex).applyMatrix4(node.matrixWorld);
      values.push(point.x,point.y,point.z);
    }
  });
  if(!values.length)throw new RangeError('The GLB contains no triangle mesh');
  if(triangleCount>MAX_TRIANGLES)throw new RangeError(`The GLB exceeds the ${MAX_TRIANGLES.toLocaleString()} triangle import limit`);
  let minX=Infinity,minY=Infinity,minZ=Infinity,maxX=-Infinity,maxY=-Infinity,maxZ=-Infinity;
  for(let i=0;i<values.length;i+=3){minX=Math.min(minX,values[i]);maxX=Math.max(maxX,values[i]);minY=Math.min(minY,values[i+1]);maxY=Math.max(maxY,values[i+1]);minZ=Math.min(minZ,values[i+2]);maxZ=Math.max(maxZ,values[i+2]);}
  const cx=(minX+maxX)/2,cy=(minY+maxY)/2,cz=(minZ+maxZ)/2,extent=Math.max(maxX-minX,maxY-minY,maxZ-minZ);
  if(!Number.isFinite(extent)||extent<1e-6)throw new RangeError('The GLB bounds are empty');
  const scale=4.4/extent;
  for(let i=0;i<values.length;i+=3){values[i]=(values[i]-cx)*scale;values[i+1]=(values[i+1]-cy)*scale;values[i+2]=(values[i+2]-cz)*scale;}
  const positions=new Float32Array(values);
  const radial=createRadialSurface(positions);
  const geometry=new THREE.BufferGeometry();geometry.setAttribute('position',new THREE.BufferAttribute(positions,3));geometry.computeVertexNormals();geometry.computeBoundingSphere();
  return {name:file.name.replace(/\.glb$/i,''),geometry,sample:radial.sample,triangleCount,coverage:radial.coverage};
}
