import assert from "node:assert/strict";
import {
  computeSlope,
  evaluateHabitat,
  updateCellState,
  GrowthSimulation,
  mossSpeciesCatalog,
} from "../src/simulation.js";

function run(name, fn) {
  try {
    fn();
    console.log(`PASS ${name}`);
  } catch (error) {
    console.error(`FAIL ${name}`);
    throw error;
  }
}

run("computeSlope returns 0 for upward normal", () => {
  assert.equal(computeSlope({ x: 0, y: 1, z: 0 }), 0);
});

run("computeSlope returns near 1 for vertical wall", () => {
  assert.ok(computeSlope({ x: 1, y: 0, z: 0 }) > 0.99);
});

run("evaluateHabitat favors supportive cells", () => {
  const good = evaluateHabitat(
    { slope: 0.7, heightNorm: 0.2, lightFacing: 0.3 },
    { moisture: 0.8, slopeBias: 0.72, lightInfluence: 0.6 }
  );
  const poor = evaluateHabitat(
    { slope: 0.1, heightNorm: 0.95, lightFacing: 0.95 },
    { moisture: 0.2, slopeBias: 0.72, lightInfluence: 0.6 }
  );
  assert.ok(good > poor);
});

run("updateCellState grows in supportive conditions", () => {
  const next = updateCellState(
    { density: 0.22, health: 0.55 },
    0.8,
    0.65,
    { growthRate: 0.55, decayRate: 0.45 }
  );
  assert.ok(next.density > 0.22);
  assert.ok(next.health > 0.55);
});

run("species preference affects habitat score", () => {
  const cell = { slope: 0.82, heightNorm: 0.28, lightFacing: 0.3 };
  const environment = { moisture: 0.5, slopeBias: 0.72, lightInfluence: 0.6 };
  const lichen = mossSpeciesCatalog[1];
  const velvet = mossSpeciesCatalog[2];
  const lichenHabitat = evaluateHabitat(cell, environment, lichen);
  const velvetHabitat = evaluateHabitat(cell, environment, velvet);
  assert.ok(lichenHabitat > velvetHabitat);
});

run("paintAt seeds density and species in radius", () => {
  const cells = [
    {
      x: 0, y: 0, z: 0,
      normal: { x: 0, y: 1, z: 0 },
      slope: 0.5, height: 0, heightNorm: 0.4, lightFacing: 0.5,
      density: 0, health: 0.3, speciesId: 0, neighbors: [1],
    },
    {
      x: 0.15, y: 0, z: 0,
      normal: { x: 0, y: 1, z: 0 },
      slope: 0.5, height: 0, heightNorm: 0.4, lightFacing: 0.5,
      density: 0, health: 0.3, speciesId: 0, neighbors: [0],
    },
  ];
  const rawToCell = new Uint32Array([0, 1]);
  const sim = new GrowthSimulation({ cells, rawToCell, rawCount: 2 }, { speciesCatalog: mossSpeciesCatalog });
  const painted = sim.paintAt({ x: 0, y: 0, z: 0 }, { radius: 0.25, strength: 1, speciesId: 2 });
  assert.ok(painted >= 1);
  assert.equal(cells[0].speciesId, 2);
  assert.ok(cells[0].density > 0);
});
