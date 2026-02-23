import { describe, it, expect } from 'vitest';
import { computeEcoScore } from './ecoScore';

describe('computeEcoScore', () => {
  it('returns 0 for the worst possible inputs', () => {
    expect(computeEcoScore({ repairabilityScore: 0, energyEfficiency: 0, carbonKg: 500 })).toBe(0);
  });

  it('returns 100 for the best possible inputs', () => {
    expect(computeEcoScore({ repairabilityScore: 10, energyEfficiency: 10, carbonKg: 0 })).toBe(100);
  });

  it('clamps out-of-range inputs', () => {
    const high = computeEcoScore({ repairabilityScore: 50, energyEfficiency: 50, carbonKg: -100 });
    expect(high).toBe(100);
  });

  it('weights repairability heaviest (0.4)', () => {
    const repairOnly = computeEcoScore({ repairabilityScore: 10, energyEfficiency: 0, carbonKg: 500 });
    const energyOnly = computeEcoScore({ repairabilityScore: 0, energyEfficiency: 10, carbonKg: 500 });
    expect(repairOnly).toBeGreaterThan(energyOnly);
    expect(repairOnly).toBe(40);
    expect(energyOnly).toBe(30);
  });

  it('treats halfway carbon at half the carbon weight', () => {
    expect(computeEcoScore({ repairabilityScore: 0, energyEfficiency: 0, carbonKg: 250 })).toBe(15);
  });
});
