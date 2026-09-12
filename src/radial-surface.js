import { clamp, directionAt } from './substrate.js';

function intersectTriangle(direction,p,t) {
  const ax=p[t],ay=p[t+1],az=p[t+2],bx=p[t+3],by=p[t+4],bz=p[t+5],cx=p[t+6],cy=p[t+7],cz=p[t+8];
  const e1x=bx-ax,e1y=by-ay,e1z=bz-az,e2x=cx-ax,e2y=cy-ay,e2z=cz-az;
  const px=direction.y*e2z-direction.z*e2y,py=direction.z*e2x-direction.x*e2z,pz=direction.x*e2y-direction.y*e2x;
  const det=e1x*px+e1y*py+e1z*pz;if(Math.abs(det)<1e-9)return null;
  const inv=1/det,tx=-ax,ty=-ay,tz=-az;
  const u=(tx*px+ty*py+tz*pz)*inv;if(u<0||u>1)return null;
  const qx=ty*e1z-tz*e1y,qy=tz*e1x-tx*e1z,qz=tx*e1y-ty*e1x;
  const v=(direction.x*qx+direction.y*qy+direction.z*qz)*inv;if(v<0||u+v>1)return null;
  const distance=(e2x*qx+e2y*qy+e2z*qz)*inv;
  return distance>1e-6?distance:null;
}

export function createRadialSurface(positions,{width=96,height=48,minCoverage=0.98}={}) {
  if(!positions||positions.length<9||positions.length%9)throw new RangeError('Triangle positions are required');
  const radii=new Float32Array(width*height),normals=new Float32Array(width*height*3);
  let hits=0,minY=Infinity,maxY=-Infinity;
  for(let i=1;i<positions.length;i+=3){minY=Math.min(minY,positions[i]);maxY=Math.max(maxY,positions[i]);}
  for(let y=0;y<height;y++)for(let x=0;x<width;x++){
    const i=y*width+x,d=directionAt((x+0.5)/width,(y+0.5)/height);let nearest=Infinity,nx=0,ny=1,nz=0;
    for(let t=0;t<positions.length;t+=9){
      const distance=intersectTriangle(d,positions,t);if(distance===null||distance>=nearest)continue;
      nearest=distance;
      const abx=positions[t+3]-positions[t],aby=positions[t+4]-positions[t+1],abz=positions[t+5]-positions[t+2],acx=positions[t+6]-positions[t],acy=positions[t+7]-positions[t+1],acz=positions[t+8]-positions[t+2];
      nx=aby*acz-abz*acy;ny=abz*acx-abx*acz;nz=abx*acy-aby*acx;
      const length=Math.hypot(nx,ny,nz)||1;nx/=length;ny/=length;nz/=length;if(nx*d.x+ny*d.y+nz*d.z<0){nx=-nx;ny=-ny;nz=-nz;}
    }
    if(nearest<Infinity){hits++;radii[i]=nearest;normals.set([nx,ny,nz],i*3);}
  }
  const coverage=hits/(width*height);if(coverage<minCoverage)throw new RangeError(`Model is not a closed radial surface (${Math.round(coverage*100)}% directional coverage)`);
  for(let pass=0;pass<4&&hits<width*height;pass++)for(let i=0;i<radii.length;i++)if(!radii[i]){
    const x=i%width,y=Math.floor(i/width),neighbors=[y*width+(x+width-1)%width,y*width+(x+1)%width,Math.max(0,y-1)*width+x,Math.min(height-1,y+1)*width+x];
    const source=neighbors.find(index=>radii[index]>0);if(source!==undefined){radii[i]=radii[source];normals.set(normals.subarray(source*3,source*3+3),i*3);hits++;}
  }
  if(hits<width*height)throw new RangeError('Model contains unsupported gaps in its radial surface');
  const sample=(u,v)=>{
    const x=((u%1+1)%1)*width-0.5,y=clamp(v)*height-0.5,x0=Math.floor(x),y0=Math.max(0,Math.min(height-1,Math.floor(y))),fx=x-x0,fy=y-y0;
    const indices=[y0*width+(x0+width)%width,y0*width+(x0+1+width)%width,Math.min(height-1,y0+1)*width+(x0+width)%width,Math.min(height-1,y0+1)*width+(x0+1+width)%width];
    const mix=(array,stride=1,offset=0)=>{const a=array[indices[0]*stride+offset]*(1-fx)+array[indices[1]*stride+offset]*fx,b=array[indices[2]*stride+offset]*(1-fx)+array[indices[3]*stride+offset]*fx;return a*(1-fy)+b*fy;};
    const d=directionAt(u,v),r=mix(radii),nx=mix(normals,3),ny=mix(normals,3,1),nz=mix(normals,3,2),nl=Math.hypot(nx,ny,nz)||1;
    return {x:d.x*r,y:d.y*r,z:d.z*r,normal:{x:nx/nl,y:ny/nl,z:nz/nl},heightNorm:clamp((d.y*r-minY)/Math.max(1e-6,maxY-minY))};
  };
  return {sample,coverage,radii,normals};
}
