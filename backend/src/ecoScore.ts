export interface EcoInputs {
  repairabilityScore: number; // 0..10
  energyEfficiency: number;   // 0..10
  carbonKg: number;           // lower is better
}

const MAX_CARBON_REFERENCE = 500; // kg CO2e — anything above gets 0 carbon points

export function computeEcoScore(input: EcoInputs): number {
  const repair = clamp(input.repairabilityScore, 0, 10) / 10;
  const energy = clamp(input.energyEfficiency, 0, 10) / 10;
  const carbon = 1 - clamp(input.carbonKg, 0, MAX_CARBON_REFERENCE) / MAX_CARBON_REFERENCE;
  // Weights: repairability 0.4, energy 0.3, carbon 0.3
  const score = repair * 0.4 + energy * 0.3 + carbon * 0.3;
  return Math.round(score * 100);
}

function clamp(n: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, n));
}
