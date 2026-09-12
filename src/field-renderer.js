import { hash, uvAt, sampleRock } from './substrate.js';

const surfaceGLSL = /* glsl */ `
uniform sampler2D mossState;
uniform sampler2D mossSpecies;
uniform vec3 mossRootColor;
uniform vec3 mossTipColor;
uniform vec3 mossStressColor;
uniform float mossColorSource;
uniform float mossColorRange;
uniform float mossColorInvert;
uniform float mossTextureScale;
uniform float mossTextureStrength;
uniform vec3 surfaceBaseColor;
uniform vec3 surfaceAccentColor;
uniform float surfaceTextureMode;
uniform float surfaceTextureScale;
uniform float surfaceTextureStrength;
uniform float surfaceRoughness;
float grain(vec3 p) { return fract(sin(dot(p, vec3(127.1,311.7,74.7))) * 43758.5453); }
float noise3(vec3 p) {
  vec3 i=floor(p), f=fract(p); f=f*f*(3.0-2.0*f);
  return mix(mix(mix(grain(i),grain(i+vec3(1,0,0)),f.x),mix(grain(i+vec3(0,1,0)),grain(i+vec3(1,1,0)),f.x),f.y),
    mix(mix(grain(i+vec3(0,0,1)),grain(i+vec3(1,0,1)),f.x),mix(grain(i+vec3(0,1,1)),grain(i+vec3(1,1,1)),f.x),f.y),f.z);
}
vec2 mossUv(vec3 p) { vec3 n=normalize(p); return vec2(atan(n.z,n.x)/6.28318530718+0.5, asin(clamp(n.y,-1.0,1.0))/3.14159265359+0.5); }
vec3 mossTone(vec2 uv, vec4 field, vec3 surfacePosition) {
  vec3 w=texture2D(mossSpecies,uv).rgb; w/=max(0.001,w.x+w.y+w.z);
  float source=0.58;
  if(mossColorSource>0.5&&mossColorSource<1.5) source=dot(w,vec3(0.18,0.58,0.88));
  else if(mossColorSource<2.5) source=1.0-field.b;
  else if(mossColorSource<3.5) source=field.g;
  else if(mossColorSource<4.5) source=field.a;
  else source=uv.y;
  source=clamp((source-0.5)*mossColorRange+0.5,0.0,1.0);
  source=mix(source,1.0-source,mossColorInvert);
  float textureMix=(noise3(surfacePosition*mossTextureScale)-0.5)*mossTextureStrength;
  return mix(mossRootColor,mossTipColor,clamp(source+textureMix,0.0,1.0));
}
`;

export function createFieldRenderer(THREE, scene, meshGeometry, options = {}) {
  const mapSize = options.coverageMapSize || 128;
  let sample = options.sampleSurface || sampleRock;
  const cushionCount = 1500;
  const maxShootCount = 60000, lowShootCount = 30000;
  const seedOffset=(Number(options.seed)||0)*0.0001;
  let quality=options.initialQuality==='low'?'low':'high';
  let density=Math.max(0.05,Math.min(1,Number(options.initialDensity) || 1));
  let representation=['surface','triangles','diamonds','cards','clumps','shoots'].includes(options.initialRepresentation)?options.initialRepresentation:'shoots';
  const makeTexture = () => {
    const t = new THREE.DataTexture(new Uint8Array(mapSize * mapSize * 4), mapSize, mapSize);
    t.magFilter = THREE.LinearFilter; t.minFilter = THREE.LinearFilter;
    t.wrapS = THREE.RepeatWrapping; t.wrapT = THREE.ClampToEdgeWrapping; t.needsUpdate = true;
    return t;
  };
  const state = makeTexture(), species = makeTexture();
  const uniforms = {
    mossState: { value: state }, mossSpecies: { value: species }, mossTime: { value: 0 },
    mossRootColor: { value: new THREE.Color('#24451f') }, mossTipColor: { value: new THREE.Color('#a5c950') },
    mossStressColor: { value: new THREE.Color('#4b2814') }, mossColorSource: { value: 1 },
    mossColorRange: { value: 1 }, mossColorInvert: { value: 0 }, mossTextureScale: { value: 18 },
    mossTextureStrength: { value: 0.22 }, mossScale: { value: 1 }, mossAspect: { value: 1 },
    mossOrientation: { value: 1 },
    surfaceBaseColor: { value: new THREE.Color('#252c2e') }, surfaceAccentColor: { value: new THREE.Color('#586063') },
    surfaceTextureMode: { value: 3 }, surfaceTextureScale: { value: 14 }, surfaceTextureStrength: { value: 0.7 },
    surfaceRoughness: { value: 0.88 },
  };
  const group = new THREE.Group(); scene.add(group);
  const material = new THREE.MeshStandardMaterial({ color: '#ffffff', roughness: 0.88 });
  material.onBeforeCompile = (shader) => {
    Object.assign(shader.uniforms, uniforms);
    shader.vertexShader = shader.vertexShader.replace('#include <common>', '#include <common>\nvarying vec3 vSurface;')
      .replace('#include <begin_vertex>', '#include <begin_vertex>\nvSurface=position;');
    shader.fragmentShader = shader.fragmentShader.replace('#include <common>', '#include <common>\nvarying vec3 vSurface;\n' + surfaceGLSL)
      .replace('#include <color_fragment>', /* glsl */ `
#include <color_fragment>
vec2 uv=mossUv(vSurface);
vec4 field=texture2D(mossState,uv);
float fine=noise3(vSurface*110.0);
float cracks=smoothstep(0.46,0.52,noise3(vSurface*surfaceTextureScale));
float materialNoise=noise3(vSurface*surfaceTextureScale);
float surfacePattern=0.18;
if(surfaceTextureMode>0.5&&surfaceTextureMode<1.5)surfacePattern=materialNoise;
else if(surfaceTextureMode>1.5&&surfaceTextureMode<2.5)surfacePattern=0.5+0.5*sin((vSurface.y+materialNoise*0.16)*surfaceTextureScale);
else if(surfaceTextureMode>2.5&&surfaceTextureMode<3.5)surfacePattern=cracks;
else if(surfaceTextureMode>3.5)surfacePattern=smoothstep(0.68,0.76,materialNoise);
vec3 stone=mix(surfaceBaseColor,surfaceAccentColor,clamp(surfacePattern*surfaceTextureStrength,0.0,1.0));
stone*=0.82+fine*0.28;
vec3 moss=mossTone(uv,field,vSurface)*(0.65+fine*0.7);
moss=mix(moss,mossStressColor,field.b*0.88);
float cover=smoothstep(0.02,0.38,field.r);
diffuseColor.rgb=mix(stone,moss,cover)*(1.0-field.a*0.12);
`)
      .replace('#include <roughnessmap_fragment>', '#include <roughnessmap_fragment>\nroughnessFactor=mix(surfaceRoughness,0.68,field.a*(1.0-cover));')
      .replace('#include <normal_fragment_begin>', /* glsl */ `
#include <normal_fragment_begin>
float relief=noise3(vSurface*85.0)*0.0012+noise3(vSurface*18.0)*0.004;
vec3 q0=dFdx(vViewPosition), q1=dFdy(vViewPosition);
vec3 r0=cross(q1,normal), r1=cross(normal,q0);
float det=dot(q0,r0);
normal=normalize(abs(det)*normal-sign(det)*(dFdx(relief)*r0+dFdy(relief)*r1));
`);
  };
  const mesh = new THREE.Mesh(meshGeometry, material);
  mesh.castShadow = true; mesh.receiveShadow = true; group.add(mesh);

  function tuftGeometry(mode = 'shoots') {
    const positions = [], colors = [];
    const tri = (a,b,c,tone) => { positions.push(...a,...b,...c); for(let i=0;i<3;i++) colors.push(tone,tone,tone); };
    if(mode==='triangles') tri([-0.38,0,0],[0.38,0,0],[0,1,0],0.8);
    else if(mode==='diamonds') {tri([0,0,0],[-0.34,0.48,0],[0,1,0],0.65);tri([0,0,0],[0,1,0],[0.34,0.48,0],0.9);}
    else if(mode==='cards') {
      tri([-0.3,0,0],[0.3,0,0],[-0.18,1,0],0.65);tri([0.3,0,0],[0.18,1,0],[-0.18,1,0],0.9);
      tri([0,0,-0.3],[0,0,0.3],[0,1,-0.18],0.65);tri([0,0,0.3],[0,1,0.18],[0,1,-0.18],0.9);
    } else {
    for(let stem=0;stem<2;stem++) {
      const angle=stem*2.39996, ox=Math.cos(angle)*0.22, oz=Math.sin(angle)*0.22;
      const h=0.6+hash(stem+50)*0.4;
      tri([ox-0.018,0,oz],[ox+0.018,0,oz],[ox+0.12,h,oz+0.04],0.55);
      for(let leaf=0;leaf<3;leaf++) {
        const y=(leaf+1)*h/4, a=angle+leaf*2.4, r=0.3*(1-y/h)+0.07;
        const x=ox+0.12*y/h,z=oz+0.04*y/h;
        tri([x,y-0.09,z],[x+Math.cos(a)*r,y+0.13,z+Math.sin(a)*r],[x+Math.cos(a+0.8)*r*0.45,y+0.015,z+Math.sin(a+0.8)*r*0.45],0.68+y*0.45);
      }
    }
    }
    const g=new THREE.BufferGeometry();
    g.setAttribute('position',new THREE.Float32BufferAttribute(positions,3));
    g.setAttribute('color',new THREE.Float32BufferAttribute(colors,3));
    g.computeVertexNormals(); return g;
  }
  function plantMaterial(isTuft, depth = false) {
    const mat = depth ? new THREE.MeshDepthMaterial({ depthPacking: THREE.RGBADepthPacking, side: THREE.DoubleSide }) :
      new THREE.MeshStandardMaterial({ color: '#ffffff', roughness: 0.94, side: isTuft ? THREE.DoubleSide : THREE.FrontSide, vertexColors: isTuft });
    mat.onBeforeCompile = (shader) => {
      Object.assign(shader.uniforms,uniforms);
      shader.vertexShader=shader.vertexShader.replace('#include <common>', '#include <common>\n' + /* glsl */ `
uniform sampler2D mossState;
uniform float mossTime;
uniform sampler2D mossSpecies;
attribute vec2 anchorUv;
attribute float variation;
attribute vec3 canopy;
uniform float mossScale;
uniform float mossAspect;
uniform float mossOrientation;
varying vec2 vAnchorUv;
varying float vTip;
varying float vAlive;
varying vec3 vPlantPosition;
`).replace('#include <begin_vertex>', /* glsl */ `
#include <begin_vertex>
vec4 f=texture2D(mossState,anchorUv);
float alive=smoothstep(0.015,0.35,f.r);
float mass=f.g;
vec3 traits=texture2D(mossSpecies,anchorUv).rgb;
traits/=max(0.001,traits.x+traits.y+traits.z);
vAnchorUv=anchorUv; vTip=position.y; vAlive=alive; vPlantPosition=position;
` + (isTuft ? /* glsl */ `
float turn=(variation-0.5)*6.28318530718*mossOrientation;
mat2 spin=mat2(cos(turn),-sin(turn),sin(turn),cos(turn));
transformed.xz=spin*transformed.xz;
transformed.xz*=mossScale*mossAspect;
transformed.y*=mossScale;
transformed*=alive*(0.5+mass*0.55);
transformed.y*=1.0-traits.y*0.5+traits.z*0.25;
transformed.xz*=1.0+traits.y*0.45;
transformed.y*=1.0-f.b*0.83;
transformed.x+=position.y*position.y*(sin(mossTime*0.65+variation*30.0)*0.025+f.b*0.55)*alive;
vec3 cushionNormal=normalize(vec3(canopy.x,canopy.y/0.64,canopy.z));
vec3 tangent=normalize(cross(vec3(0.0,0.0,1.0),cushionNormal));
transformed=tangent*transformed.x+cushionNormal*transformed.y+cross(cushionNormal,tangent)*transformed.z;
transformed+=canopy*vec3(alive*(0.6+mass*0.5),alive*(0.18+mass*0.85)*(1.0-f.b*0.65),alive*(0.6+mass*0.5));
` : /* glsl */ `
transformed.xz*=alive*(0.6+mass*0.5);
transformed.y*=alive*(0.18+mass*0.85)*(1.0-f.b*0.65);
`));
      if (!depth) shader.fragmentShader=shader.fragmentShader.replace('#include <common>','#include <common>\nvarying vec2 vAnchorUv;\nvarying float vTip;\nvarying float vAlive;\nvarying vec3 vPlantPosition;\n'+surfaceGLSL)
        .replace('#include <color_fragment>', /* glsl */ `
#include <color_fragment>
if(vAlive<0.005) discard;
vec4 f=texture2D(mossState,vAnchorUv);
vec3 tone=mossTone(vAnchorUv,f,vPlantPosition);
tone=mix(tone,mossStressColor,f.b*0.92);
float grainDetail=noise3(vPlantPosition*95.0);
diffuseColor.rgb*=tone*(0.28+clamp(vTip,0.0,1.0)*0.32+grainDetail*0.65);
`);
      if(!depth && !isTuft) shader.fragmentShader=shader.fragmentShader.replace('#include <normal_fragment_begin>', `
#include <normal_fragment_begin>
float pile=noise3(vPlantPosition*95.0)*0.0015;
vec3 q0=dFdx(vViewPosition),q1=dFdy(vViewPosition);
vec3 r0=cross(q1,normal),r1=cross(normal,q0);
float det=dot(q0,r0);
normal=normalize(abs(det)*normal-sign(det)*(dFdx(pile)*r0+dFdy(pile)*r1));
`);
    };
    mat.customProgramCacheKey=()=> 'koke-plants-'+isTuft+'-'+depth;
    return mat;
  }
  function positionPlants(plant,count,isTuft) {
    const g=plant.geometry;
    const uvs=new Float32Array(count*2), variations=new Float32Array(count), canopies=new Float32Array(count*3);
    const dummy=new THREE.Object3D(), up=new THREE.Vector3(0,1,0), normal=new THREE.Vector3();
    for(let i=0;i<count;i++) {
      // Fibonacci anchors are stable, approximately equal-area, and independent of field resolution.
      const parent=isTuft?i%cushionCount:i;
      const y=1-2*(parent+0.18+hash(parent+seedOffset+19)*0.64)/cushionCount;
      const angle=parent*2.39996322973+hash(seedOffset+5)*Math.PI*2+(hash(parent*2.31+seedOffset+41)-0.5)*1.15;
      const d={x:Math.sqrt(1-y*y)*Math.cos(angle),y,z:Math.sqrt(1-y*y)*Math.sin(angle)};
      const {u,v}=uvAt(d), p=sample(u,v);
      uvs.set([u,v],i*2);variations[i]=hash(i+37+seedOffset);
      normal.set(p.normal.x,p.normal.y,p.normal.z);
      dummy.position.set(p.x,p.y,p.z).addScaledVector(normal,0.004);
      dummy.quaternion.setFromUnitVectors(up,normal);dummy.rotateY(hash(parent+4+seedOffset)*Math.PI*2);
      const parentRadius=0.09+hash(parent+8+seedOffset)*0.12;
      const radius=isTuft?0.075+hash(i+8+seedOffset)*0.04:parentRadius;
      dummy.scale.set(radius,isTuft?radius:radius*0.8,radius);
      if(isTuft){
        const az=hash(i+69+seedOffset)*Math.PI*2, r=Math.sqrt(hash(i+92+seedOffset))*0.94;
        canopies.set([Math.cos(az)*r*parentRadius/radius,Math.sqrt(1-r*r)*parentRadius*0.8/radius,Math.sin(az)*r*parentRadius/radius],i*3);
      }
      dummy.updateMatrix();plant.setMatrixAt(i,dummy.matrix);
    }
    g.setAttribute('anchorUv',new THREE.InstancedBufferAttribute(uvs,2));
    g.setAttribute('variation',new THREE.InstancedBufferAttribute(variations,1));
    g.setAttribute('canopy',new THREE.InstancedBufferAttribute(canopies,3));
    plant.instanceMatrix.needsUpdate=true;
  }
  function makePlants(count,isTuft) {
    const initialMode=['surface','clumps'].includes(representation)?'triangles':representation;
    const g=isTuft?tuftGeometry(initialMode):new THREE.SphereGeometry(1,9,5,0,Math.PI*2,0,Math.PI/2);
    const plant=new THREE.InstancedMesh(g,plantMaterial(isTuft),count);
    plant.customDepthMaterial=plantMaterial(isTuft,true);
    plant.userData.capacity=count;
    positionPlants(plant,count,isTuft);
    plant.castShadow=!isTuft;plant.receiveShadow=true;plant.frustumCulled=false;
    group.add(plant);return plant;
  }
  const clumps=makePlants(cushionCount,false);let tufts=makePlants(quality==='low'?lowShootCount:maxShootCount,true);
  const dew = new THREE.InstancedMesh(new THREE.SphereGeometry(1, 16, 10), new THREE.MeshPhysicalMaterial({
    color: '#e3f2e3', roughness: 0.035, transmission: 0.95, thickness: 0.15, ior: 1.333, envMap: scene.userData.dewEnvironment, envMapIntensity: 1.5,
  }), 24);
  dew.visible = false; dew.frustumCulled = false; group.add(dew);
  const dewAnchors = Array.from({length:24},(_,i)=>{
    const u=hash(i+91+seedOffset),v=0.56+hash(i+201+seedOffset)*0.33;
    return {u,v,p:sample(u,v),radius:0.035+hash(i+812+seedOffset)*0.055};
  });
  const dewDummy=new THREE.Object3D(),dewUp=new THREE.Vector3(0,1,0),dewNormal=new THREE.Vector3();
  const particleGeometry=new THREE.BufferGeometry();
  const particlePositions=new Float32Array(160*3);
  particleGeometry.setAttribute('position',new THREE.BufferAttribute(particlePositions,3).setUsage(THREE.DynamicDrawUsage));
  const particleMaterial=new THREE.PointsMaterial({color:'#e7efad',size:0.022,transparent:true,opacity:0.8,depthWrite:false});
  particleMaterial.onBeforeCompile=(shader)=>{
    shader.fragmentShader=shader.fragmentShader.replace('#include <color_fragment>', '#include <color_fragment>\nfloat r=length(gl_PointCoord-0.5); if(r>0.5) discard; diffuseColor.a*=smoothstep(0.5,0.1,r);');
  };
  const particles=new THREE.Points(particleGeometry,particleMaterial);particles.frustumCulled=false;group.add(particles);
  let liveClumps=0;
  function syncRepresentation() {
    clumps.visible=representation==='clumps'||representation==='shoots';
    tufts.visible=!['surface','clumps'].includes(representation);
    const qualityLimit=quality==='low'?lowShootCount:maxShootCount;
    tufts.count=Math.min(tufts.userData.capacity,Math.max(1,Math.round(qualityLimit*density)));
  }
  function ensureTuftCapacity(capacity) {
    if(tufts.userData.capacity>=capacity)return false;
    group.remove(tufts);tufts.geometry.dispose();tufts.material.dispose();tufts.customDepthMaterial.dispose();
    tufts=makePlants(capacity,true);
    return true;
  }
  syncRepresentation();
  return {
    mesh, group, clumps, get tufts(){return tufts;},
    setCoverage(map) {
      state.image.data.set(map.data);species.image.data.set(map.species);
      state.needsUpdate=true;species.needsUpdate=true;
      const uv=clumps.geometry.attributes.anchorUv;
      liveClumps=0;
      for(let i=0;i<clumps.count;i++){
        const x=Math.floor(uv.getX(i)*mapSize)%mapSize,y=Math.min(mapSize-1,Math.floor(uv.getY(i)*mapSize));
        if(map.data[(y*mapSize+x)*4]>4)liveClumps++;
      }
      for(let i=0;i<dewAnchors.length;i++){
        const a=dewAnchors[i],k=(Math.min(mapSize-1,Math.floor(a.v*mapSize))*mapSize+Math.floor(a.u*mapSize))*4;
        const wet=map.data[k+3]/255,cover=map.data[k]/255;
        const r=a.radius*Math.max(0,(wet-0.35)/0.65)*(1-cover);
        dewNormal.set(a.p.normal.x,a.p.normal.y,a.p.normal.z);
        dewDummy.position.set(a.p.x,a.p.y,a.p.z).addScaledVector(dewNormal,r*0.72);
        dewDummy.quaternion.setFromUnitVectors(dewUp,dewNormal);dewDummy.scale.set(r,r*0.82,r);
        dewDummy.updateMatrix();dew.setMatrixAt(i,dewDummy.matrix);
      }
      dew.instanceMatrix.needsUpdate=true;
    },
    update(time,spores) {
      uniforms.mossTime.value=time;
      let count=0;
      for(const p of spores.particles) if(p.state>0&&count<160){particlePositions.set([p.x,p.y,p.z],count*3);count++;}
      particleGeometry.setDrawRange(0,count);particleGeometry.attributes.position.needsUpdate=true;
    },
    setSurface(nextSample,nextGeometry) {
      if(typeof nextSample!=='function'||!nextGeometry?.attributes?.position)throw new TypeError('A sampler and geometry are required');
      sample=nextSample;
      const previous=mesh.geometry;mesh.geometry=nextGeometry;if(previous!==nextGeometry)previous.dispose();
      positionPlants(clumps,cushionCount,false);positionPlants(tufts,tufts.userData.capacity,true);
      for(const anchor of dewAnchors)anchor.p=sample(anchor.u,anchor.v);
    },
    setRepresentation(mode) {
      if(!['surface','triangles','diamonds','cards','clumps','shoots'].includes(mode))throw new RangeError('Unknown moss representation');
      representation=mode;
      const expanded=quality==='high'&&!['surface','clumps'].includes(mode)&&ensureTuftCapacity(maxShootCount);
      if(!['surface','clumps'].includes(mode)&&!expanded){
        const previous=tufts.geometry;tufts.geometry=tuftGeometry(mode);positionPlants(tufts,tufts.userData.capacity,true);previous.dispose();
      }
      syncRepresentation();
    },
    setAppearance(next={}) {
      if(next.rootColor)uniforms.mossRootColor.value.set(next.rootColor);
      if(next.tipColor)uniforms.mossTipColor.value.set(next.tipColor);
      if(next.stressColor)uniforms.mossStressColor.value.set(next.stressColor);
      if(next.colorSource){const sources={uniform:0,species:1,health:2,thickness:3,moisture:4,height:5};if(!(next.colorSource in sources))throw new RangeError('Unknown color source');uniforms.mossColorSource.value=sources[next.colorSource];}
      for(const [key,uniform] of [['colorRange','mossColorRange'],['textureScale','mossTextureScale'],['textureStrength','mossTextureStrength'],['scale','mossScale'],['aspect','mossAspect'],['orientation','mossOrientation']])if(next[key]!==undefined)uniforms[uniform].value=Number(next[key]);
      if(next.invert!==undefined)uniforms.mossColorInvert.value=next.invert?1:0;
    },
    setSurfaceAppearance(next={}) {
      if(next.baseColor)uniforms.surfaceBaseColor.value.set(next.baseColor);
      if(next.accentColor)uniforms.surfaceAccentColor.value.set(next.accentColor);
      if(next.texture){const modes={smooth:0,grain:1,layered:2,cracked:3,speckled:4};if(!(next.texture in modes))throw new RangeError('Unknown surface texture');uniforms.surfaceTextureMode.value=modes[next.texture];}
      if(next.textureScale!==undefined)uniforms.surfaceTextureScale.value=Number(next.textureScale);
      if(next.textureStrength!==undefined)uniforms.surfaceTextureStrength.value=Number(next.textureStrength);
      if(next.roughness!==undefined)uniforms.surfaceRoughness.value=Number(next.roughness);
    },
    setDensity(value){density=Math.max(0.05,Math.min(1,Number(value)));syncRepresentation();},
    setQuality(value) {if(!['low','high'].includes(value))throw new RangeError('Unknown render quality');quality=value;if(value==='high'&&!['surface','clumps'].includes(representation))ensureTuftCapacity(maxShootCount);syncRepresentation();},
    setDew(value) {dew.visible=Boolean(value);},
    setWireframe(value) {material.wireframe=value;clumps.material.wireframe=value;tufts.material.wireframe=value;},
    getStats() {return {clumpCount:liveClumps,maxClumps:clumps.count,tuftCount:tufts.visible?tufts.count:0,mapSize,representation,density};},
  };
}
