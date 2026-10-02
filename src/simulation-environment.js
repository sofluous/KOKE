export const FIXED_STEP = 1 / 20;

export const defaultFieldEnvironment = Object.freeze({
  moisture: 0.72,
  slopeBias: 0.55,
  lightInfluence: 0.66,
  growthRate: 0.55,
  decayRate: 0.42,
  diffusionRate: 0.3,
  colonization: 0.55,
  gravityCreep: 0.28,
  cycleSpeed: 0.28,
});

export function createFieldEnvironment(input = {}) {
  const environment = { ...defaultFieldEnvironment };
  for (const [key, value] of Object.entries(input)) {
    if (!(key in environment)) throw new RangeError(`Unknown environment setting: ${key}`);
    if (!Number.isFinite(value) || value < 0 || value > 1) {
      throw new RangeError(`${key} must be between 0 and 1`);
    }
    environment[key] = value;
  }
  return environment;
}
