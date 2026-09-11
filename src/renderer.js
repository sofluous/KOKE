function hexToVec3Array(THREE, hex) {
  const c = new THREE.Color(hex);
  return [c.r, c.g, c.b];
}

export function createMossRenderer(THREE, scene, meshGeometry, options = {}) {
  const speciesPalette = options.speciesPalette || ["#5f8f4f", "#8cae78", "#4f8557"];
  const speciesProfiles = options.speciesProfiles || [];
  const mapSize = options.coverageMapSize || 160;
  const bounds = options.bounds || { minX: -2.2, maxX: 2.2, minZ: -2.2, maxZ: 2.2 };

  const geometry = meshGeometry.clone();
  const speciesAttr = new THREE.BufferAttribute(new Float32Array(geometry.attributes.position.count), 1);
  geometry.setAttribute("mossSpecies", speciesAttr);

  const coverageTexture = new THREE.DataTexture(
    new Float32Array(mapSize * mapSize * 4),
    mapSize,
    mapSize,
    THREE.RGBAFormat,
    THREE.FloatType
  );
  coverageTexture.needsUpdate = true;
  coverageTexture.magFilter = THREE.LinearFilter;
  coverageTexture.minFilter = THREE.LinearFilter;
  coverageTexture.wrapS = THREE.ClampToEdgeWrapping;
  coverageTexture.wrapT = THREE.ClampToEdgeWrapping;

  const material = new THREE.MeshStandardMaterial({
    color: "#58635c",
    roughness: 0.86,
    metalness: 0.02,
  });

  material.onBeforeCompile = (shader) => {
    const paletteVec = speciesPalette.map((hex) => hexToVec3Array(THREE, hex));
    while (paletteVec.length < 3) paletteVec.push(paletteVec[0]);

    shader.uniforms.mossSpeciesA = { value: new THREE.Vector3(...paletteVec[0]) };
    shader.uniforms.mossSpeciesB = { value: new THREE.Vector3(...paletteVec[1]) };
    shader.uniforms.mossSpeciesC = { value: new THREE.Vector3(...paletteVec[2]) };
    shader.uniforms.mossDeadTone = { value: new THREE.Vector3(0.31, 0.29, 0.25) };
    shader.uniforms.mossStateMap = { value: coverageTexture };
    shader.uniforms.mossBounds = {
      value: new THREE.Vector4(bounds.minX, bounds.maxX, bounds.minZ, bounds.maxZ),
    };
    shader.uniforms.mossTexel = { value: new THREE.Vector2(1 / mapSize, 1 / mapSize) };

    shader.vertexShader = shader.vertexShader
      .replace(
        "#include <common>",
        "#include <common>\nattribute float mossSpecies;\nvarying float vMossSpecies;\nvarying vec3 vWorldPos;\nvarying vec2 vMossUv;\nvarying vec3 vWorldNormal;\nuniform vec4 mossBounds;"
      )
      .replace(
        "#include <begin_vertex>",
        "#include <begin_vertex>\nvMossSpecies = mossSpecies;\nvWorldPos = (modelMatrix * vec4(transformed, 1.0)).xyz;\nvWorldNormal = normalize((modelMatrix * vec4(objectNormal, 0.0)).xyz);\nfloat u = (transformed.x - mossBounds.x) / max(0.0001, mossBounds.y - mossBounds.x);\nfloat v = (transformed.z - mossBounds.z) / max(0.0001, mossBounds.w - mossBounds.z);\nvMossUv = vec2(clamp(u, 0.0, 1.0), clamp(v, 0.0, 1.0));"
      );

    shader.fragmentShader = shader.fragmentShader
      .replace(
        "#include <common>",
        "#include <common>\nvarying float vMossSpecies;\nvarying vec3 vWorldPos;\nvarying vec2 vMossUv;\nvarying vec3 vWorldNormal;\nuniform vec3 mossSpeciesA;\nuniform vec3 mossSpeciesB;\nuniform vec3 mossSpeciesC;\nuniform vec3 mossDeadTone;\nuniform sampler2D mossStateMap;\nuniform vec2 mossTexel;\nfloat hash31(vec3 p){return fract(sin(dot(p, vec3(127.1,311.7,74.7))) * 43758.5453123);}float noise3(vec3 p){vec3 i=floor(p);vec3 f=fract(p);f=f*f*(3.0-2.0*f);float n000=hash31(i+vec3(0.0,0.0,0.0));float n100=hash31(i+vec3(1.0,0.0,0.0));float n010=hash31(i+vec3(0.0,1.0,0.0));float n110=hash31(i+vec3(1.0,1.0,0.0));float n001=hash31(i+vec3(0.0,0.0,1.0));float n101=hash31(i+vec3(1.0,0.0,1.0));float n011=hash31(i+vec3(0.0,1.0,1.0));float n111=hash31(i+vec3(1.0,1.0,1.0));float nx00=mix(n000,n100,f.x);float nx10=mix(n010,n110,f.x);float nx01=mix(n001,n101,f.x);float nx11=mix(n011,n111,f.x);float nxy0=mix(nx00,nx10,f.y);float nxy1=mix(nx01,nx11,f.y);return mix(nxy0,nxy1,f.z);}vec3 speciesColorFromNorm(float t){float s = clamp(t,0.0,1.0)*2.0; if (s<0.5) return mossSpeciesA; if (s<1.5) return mossSpeciesB; return mossSpeciesC;}"
      )
      .replace(
        "#include <color_fragment>",
        "#include <color_fragment>\nvec4 state = texture2D(mossStateMap, vMossUv);\nfloat d = state.r;\nfloat m = state.g;\nfloat h = state.b;\nfloat sNorm = state.a;\nfloat dN = texture2D(mossStateMap, vMossUv + vec2(0.0, mossTexel.y)).r;\nfloat dS = texture2D(mossStateMap, vMossUv - vec2(0.0, mossTexel.y)).r;\nfloat dE = texture2D(mossStateMap, vMossUv + vec2(mossTexel.x, 0.0)).r;\nfloat dW = texture2D(mossStateMap, vMossUv - vec2(mossTexel.x, 0.0)).r;\nfloat bloomField = (d + m * 1.2 + dN + dS + dE + dW) / 6.2;\nfloat edge = abs(dE - dW) + abs(dN - dS);\nfloat organic = noise3(vWorldPos * 1.15) * 0.45 + noise3(vWorldPos * 2.85) * 0.35 + noise3(vWorldPos * 5.6) * 0.2;\nfloat slopeShade = 1.0 - clamp(vWorldNormal.y * 0.5 + 0.5, 0.0, 1.0);\nfloat liquidPhase = smoothstep(0.22, 0.95, h) * (1.0 - smoothstep(0.42, 0.9, m));\nfloat sporePhase = smoothstep(0.05, 0.34, bloomField + edge * 0.34 + (organic - 0.5) * 0.32);\nfloat bloomPhase = smoothstep(0.24, 0.84, m + organic * 0.1);\nfloat maturePhase = smoothstep(0.5, 0.95, m) * smoothstep(0.22, 0.88, h);\nfloat decayPhase = smoothstep(0.08, 0.34, 1.0 - h) * smoothstep(0.25, 0.7, m);\nfloat deathPhase = smoothstep(0.0, 0.16, h) * smoothstep(0.0, 0.22, m) * (1.0 - sporePhase);\nfloat mossMask = clamp(liquidPhase * 0.5 + sporePhase * 0.44 + bloomPhase * 0.56 + maturePhase * 0.32 - deathPhase * 0.22, 0.0, 1.0);\nvec3 speciesColor = speciesColorFromNorm(sNorm);\nfloat speciesGrain = 0.0;\nif (sNorm < 0.34) { speciesGrain = noise3(vWorldPos * 4.8) * 0.65 + noise3(vWorldPos * 9.2) * 0.35; }\nelse if (sNorm < 0.67) { speciesGrain = noise3(vWorldPos * 2.1) * 0.55 + noise3(vWorldPos * 6.4) * 0.45; }\nelse { speciesGrain = noise3(vWorldPos * 6.3) * 0.58 + noise3(vWorldPos * 12.5) * 0.42; }\nvec3 liquidTint = mix(speciesColor * 0.92, speciesColor * 1.32, liquidPhase);\nvec3 sporeTint = mix(liquidTint, speciesColor * 1.12, sporePhase);\nvec3 matureTint = mix(sporeTint, speciesColor * (0.9 + speciesGrain * 0.22), maturePhase);\nvec3 decayTint = mix(matureTint, mossDeadTone, decayPhase * 0.8 + deathPhase * 0.55);\ndecayTint *= 0.92 + slopeShade * 0.14;\ndiffuseColor.rgb = mix(diffuseColor.rgb, decayTint, mossMask * 0.96);"
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
  const maxClumps = 2200;
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
  const triColor = new THREE.Color();

  function hash1(n) {
    const x = Math.sin(n * 12.9898) * 43758.5453;
    return x - Math.floor(x);
  }

  function setCoverage(speciesBuffer, coverageMap) {
    if (speciesBuffer) {
      speciesAttr.array.set(speciesBuffer);
      speciesAttr.needsUpdate = true;
    }
    if (coverageMap?.data) {
      coverageTexture.image.data.set(coverageMap.data);
      coverageTexture.needsUpdate = true;
    }
  }

  function profileForSpecies(speciesId) {
    return speciesProfiles[speciesId]?.clumpProfile || { scale: 1, verticality: 1, patchiness: 0.6 };
  }

  function updateClumps(cells, triangles) {
    let idx = 0;
    const triCount = Math.floor(triangles.length / 3);
    const stride = Math.max(1, Math.floor(triCount / 2000));

    for (let tri = 0; tri < triCount && idx < maxClumps; tri += stride) {
      const base = tri * 3;
      const cellA = cells[triangles[base]];
      const cellB = cells[triangles[base + 1]];
      const cellC = cells[triangles[base + 2]];
      const avgMass = (cellA.mass + cellB.mass + cellC.mass) / 3;
      const avgHealth = (cellA.health + cellB.health + cellC.health) / 3;
      if (avgMass < 0.44 || avgHealth < 0.34) continue;

      const speciesScores = [0, 0, 0];
      speciesScores[cellA.speciesId] += cellA.density;
      speciesScores[cellB.speciesId] += cellB.density;
      speciesScores[cellC.speciesId] += cellC.density;
      const dominantSpecies = speciesScores[2] > speciesScores[1]
        ? (speciesScores[2] > speciesScores[0] ? 2 : 0)
        : (speciesScores[1] > speciesScores[0] ? 1 : 0);
      const profile = profileForSpecies(dominantSpecies);

      const spawnCount = Math.max(1, Math.min(3, Math.floor((avgMass - 0.35) * 5)));
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
        tempPosition.addScaledVector(tempNormal, 0.008 + hash1(tri * 2.19 + s * 1.31) * 0.01);
        tempQuaternion.setFromUnitVectors(up, tempNormal);

        const baseScale = (0.025 + avgMass * 0.11) * profile.scale;
        const jitter = 0.88 + hash1(tri * 9.41 + s * 4.23) * 0.24;
        const sxy = baseScale * jitter;
        const vertical = (0.52 + avgHealth * 0.6) * profile.verticality;
        tempScale.set(sxy, sxy * vertical, sxy * (0.9 + hash1(s * 12.1 + tri) * 0.2));
        tempMatrix.compose(tempPosition, tempQuaternion, tempScale);
        clumps.setMatrixAt(idx, tempMatrix);

        triColor.set(speciesPalette[Math.max(0, Math.min(speciesPalette.length - 1, dominantSpecies))]);
        triColor.offsetHSL(0, 0, -0.03 + hash1(idx * 1.73) * 0.06);
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
      mapSize,
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
