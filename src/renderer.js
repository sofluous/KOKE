function hexToVec3Array(THREE, hex) {
  const c = new THREE.Color(hex);
  return [c.r, c.g, c.b];
}

export function createMossRenderer(THREE, scene, meshGeometry, options = {}) {
  const speciesPalette = options.speciesPalette || ["#5f8f4f", "#8cae78", "#4f8557"];
  const geometry = meshGeometry.clone();
  const densityAttr = new THREE.BufferAttribute(new Float32Array(geometry.attributes.position.count), 1);
  const speciesAttr = new THREE.BufferAttribute(new Float32Array(geometry.attributes.position.count), 1);
  geometry.setAttribute("mossDensity", densityAttr);
  geometry.setAttribute("mossSpecies", speciesAttr);

  const material = new THREE.MeshStandardMaterial({
    color: "#58635c",
    roughness: 0.9,
    metalness: 0.02,
  });

  material.onBeforeCompile = (shader) => {
    const paletteVec = speciesPalette.map((hex) => hexToVec3Array(THREE, hex));
    while (paletteVec.length < 3) paletteVec.push(paletteVec[0]);

    shader.uniforms.mossSpeciesA = { value: new THREE.Vector3(...paletteVec[0]) };
    shader.uniforms.mossSpeciesB = { value: new THREE.Vector3(...paletteVec[1]) };
    shader.uniforms.mossSpeciesC = { value: new THREE.Vector3(...paletteVec[2]) };

    shader.vertexShader = shader.vertexShader
      .replace(
        "#include <common>",
        "#include <common>\nattribute float mossDensity;\nattribute float mossSpecies;\nvarying float vMossDensity;\nvarying float vMossSpecies;\nvarying vec3 vWorldPos;"
      )
      .replace(
        "#include <begin_vertex>",
        "#include <begin_vertex>\nvMossDensity = mossDensity;\nvMossSpecies = mossSpecies;\nvWorldPos = (modelMatrix * vec4(transformed, 1.0)).xyz;"
      );

    shader.fragmentShader = shader.fragmentShader
      .replace(
        "#include <common>",
        "#include <common>\nvarying float vMossDensity;\nvarying float vMossSpecies;\nvarying vec3 vWorldPos;\nuniform vec3 mossSpeciesA;\nuniform vec3 mossSpeciesB;\nuniform vec3 mossSpeciesC;\nfloat hash31(vec3 p){return fract(sin(dot(p, vec3(127.1,311.7,74.7))) * 43758.5453123);}float noise3(vec3 p){vec3 i=floor(p);vec3 f=fract(p);f=f*f*(3.0-2.0*f);float n000=hash31(i+vec3(0.0,0.0,0.0));float n100=hash31(i+vec3(1.0,0.0,0.0));float n010=hash31(i+vec3(0.0,1.0,0.0));float n110=hash31(i+vec3(1.0,1.0,0.0));float n001=hash31(i+vec3(0.0,0.0,1.0));float n101=hash31(i+vec3(1.0,0.0,1.0));float n011=hash31(i+vec3(0.0,1.0,1.0));float n111=hash31(i+vec3(1.0,1.0,1.0));float nx00=mix(n000,n100,f.x);float nx10=mix(n010,n110,f.x);float nx01=mix(n001,n101,f.x);float nx11=mix(n011,n111,f.x);float nxy0=mix(nx00,nx10,f.y);float nxy1=mix(nx01,nx11,f.y);return mix(nxy0,nxy1,f.z);}"
      )
      .replace(
        "#include <color_fragment>",
        "#include <color_fragment>\nfloat organic = noise3(vWorldPos * 1.2) * 0.7 + noise3(vWorldPos * 2.7) * 0.3;\nfloat coverage = clamp(vMossDensity * 0.85 + (organic - 0.5) * 0.28, 0.0, 1.0);\nfloat mossMask = smoothstep(0.26, 0.8, coverage);\nvec3 speciesColor = mossSpeciesA;\nif (vMossSpecies > 1.5) speciesColor = mossSpeciesC;\nelse if (vMossSpecies > 0.5) speciesColor = mossSpeciesB;\ndiffuseColor.rgb = mix(diffuseColor.rgb, speciesColor, mossMask * 0.87);"
      );
    material.userData.shader = shader;
  };

  const mesh = new THREE.Mesh(geometry, material);
  scene.add(mesh);

  const clumpGeometry = new THREE.DodecahedronGeometry(0.09, 0);
  const clumpMaterial = new THREE.MeshStandardMaterial({
    color: "#7cad67",
    roughness: 1,
    metalness: 0,
    vertexColors: true,
  });
  const maxClumps = 3200;
  const clumps = new THREE.InstancedMesh(clumpGeometry, clumpMaterial, maxClumps);
  clumps.count = 0;
  scene.add(clumps);

  const tempPosition = new THREE.Vector3();
  const tempA = new THREE.Vector3();
  const tempB = new THREE.Vector3();
  const tempC = new THREE.Vector3();
  const tempNormal = new THREE.Vector3();
  const tempQuaternion = new THREE.Quaternion();
  const tempScale = new THREE.Vector3();
  const tempMatrix = new THREE.Matrix4();
  const up = new THREE.Vector3(0, 1, 0);
  const colorA = new THREE.Color();
  const colorB = new THREE.Color();
  const colorC = new THREE.Color();
  const triColor = new THREE.Color();

  function hash1(n) {
    const x = Math.sin(n * 12.9898) * 43758.5453;
    return x - Math.floor(x);
  }

  function setCoverage(densityBuffer, speciesBuffer) {
    densityAttr.array.set(densityBuffer);
    densityAttr.needsUpdate = true;
    if (speciesBuffer) {
      speciesAttr.array.set(speciesBuffer);
      speciesAttr.needsUpdate = true;
    }
  }

  function pickSpeciesColor(speciesId) {
    const hex = speciesPalette[Math.max(0, Math.min(speciesPalette.length - 1, speciesId))];
    return triColor.set(hex);
  }

  function updateClumps(cells, triangles) {
    let idx = 0;
    const triCount = Math.floor(triangles.length / 3);
    const stride = Math.max(1, Math.floor(triCount / 2400));

    for (let tri = 0; tri < triCount && idx < maxClumps; tri += stride) {
      const base = tri * 3;
      const cellA = cells[triangles[base]];
      const cellB = cells[triangles[base + 1]];
      const cellC = cells[triangles[base + 2]];
      const avgDensity = (cellA.density + cellB.density + cellC.density) / 3;
      const avgHealth = (cellA.health + cellB.health + cellC.health) / 3;
      if (avgDensity < 0.42 || avgHealth < 0.32) continue;

      const speciesScores = [0, 0, 0];
      speciesScores[cellA.speciesId] += cellA.density;
      speciesScores[cellB.speciesId] += cellB.density;
      speciesScores[cellC.speciesId] += cellC.density;
      const dominantSpecies = speciesScores[2] > speciesScores[1]
        ? (speciesScores[2] > speciesScores[0] ? 2 : 0)
        : (speciesScores[1] > speciesScores[0] ? 1 : 0);

      const spawnCount = Math.min(3, 1 + Math.floor((avgDensity - 0.42) * 6));
      for (let s = 0; s < spawnCount && idx < maxClumps; s += 1) {
        const r1 = hash1(tri * 7.17 + s * 3.11);
        const r2 = hash1(tri * 11.73 + s * 5.29);
        const sqrtR1 = Math.sqrt(r1);
        const u = 1 - sqrtR1;
        const v = sqrtR1 * (1 - r2);
        const w = sqrtR1 * r2;

        tempA.set(cellA.x, cellA.y, cellA.z);
        tempB.set(cellB.x, cellB.y, cellB.z);
        tempC.set(cellC.x, cellC.y, cellC.z);
        tempPosition.copy(tempA.multiplyScalar(u).add(tempB.multiplyScalar(v)).add(tempC.multiplyScalar(w)));

        tempNormal
          .set(
            cellA.normal.x + cellB.normal.x + cellC.normal.x,
            cellA.normal.y + cellB.normal.y + cellC.normal.y,
            cellA.normal.z + cellB.normal.z + cellC.normal.z
          )
          .normalize();
        tempPosition.addScaledVector(tempNormal, 0.01 + hash1(tri * 2.19 + s * 1.31) * 0.012);
        tempQuaternion.setFromUnitVectors(up, tempNormal);

        const baseScale = 0.045 + avgDensity * 0.14;
        const jitter = 0.82 + hash1(tri * 9.41 + s * 4.23) * 0.36;
        const sxy = baseScale * jitter;
        tempScale.set(sxy, sxy * (1.05 + avgHealth * 0.45), sxy);
        tempMatrix.compose(tempPosition, tempQuaternion, tempScale);
        clumps.setMatrixAt(idx, tempMatrix);

        colorA.set(speciesPalette[Math.max(0, Math.min(speciesPalette.length - 1, dominantSpecies))]);
        colorB.copy(colorA).offsetHSL(0, 0, -0.05 + hash1(idx * 1.73) * 0.08);
        colorC.copy(colorB).multiplyScalar(0.98 + hash1(idx * 0.77) * 0.08);
        pickSpeciesColor(dominantSpecies).copy(colorC);
        clumps.setColorAt(idx, triColor);
        idx += 1;
      }
    }

    clumps.count = idx;
    clumps.instanceMatrix.needsUpdate = true;
    if (clumps.instanceColor) clumps.instanceColor.needsUpdate = true;
  }

  function setWireframe(value) {
    mesh.material.wireframe = Boolean(value);
  }

  function getStats() {
    return {
      clumpCount: clumps.count,
      maxClumps,
    };
  }

  return {
    mesh,
    clumps,
    setCoverage,
    updateClumps,
    setWireframe,
    getStats,
  };
}
