/**
 * SDK Level 1 (Browser) - Agent config + pricing/filter evaluation
 *
 * Goal: make /standard-api map to the real SDK's Level 1 mental model:
 * an "Agent" that decides whether to accept jobs based on pricing + filters.
 *
 * This is intentionally browser-friendly and mirrors the core semantics used
 * in the docs-site standard playground.
 */

export type UnitType = 'word' | 'character' | 'request';

export interface PricingConfig {
  baseCost: number;
  perUnitCost: number;
  unitType: UnitType;
  marginPercent: number;
}

export interface FilterConfig {
  minBudget: number;
  maxBudget: number;
}

export interface AgentConfig {
  name: string;
  autoAccept: boolean;
  concurrency: number;
  pricing: PricingConfig;
  filter: FilterConfig;
}

export interface PriceCalculation {
  cost: number;
  price: number;
  profit: number;
  marginActual: number;
}

export interface JobDecision {
  accept: boolean;
  reason: string;
  calculation: PriceCalculation;
}

export function calculatePrice(
  pricing: PricingConfig,
  units: number
): PriceCalculation {
  const safeUnits = Number.isFinite(units) && units > 0 ? units : 0;
  const cost = (pricing.baseCost ?? 0) + (pricing.perUnitCost ?? 0) * safeUnits;

  // Match real SDK semantics (sdk-js PriceCalculator):
  // margin is profit share of the final price (0..1), and:
  // price = cost / (1 - margin)
  const margin = Math.max(0, Math.min(0.95, (pricing.marginPercent ?? 0) / 100));
  let price = cost / (1 - margin);

  // Match SDK bounds defaults (minimum ACTP = $0.05)
  const minimum = 0.05;
  const maximum = 10000;
  price = Math.max(minimum, Math.min(maximum, price));

  const profit = price - cost;
  const marginActual = price > 0 ? (profit / price) * 100 : 0;
  return { cost, price, profit, marginActual };
}

export function evaluateJob(
  config: AgentConfig,
  budget: number,
  units: number
): JobDecision {
  const calculation = calculatePrice(config.pricing, units);

  // Filter constraints
  if (budget < config.filter.minBudget) {
    return {
      accept: false,
      reason: `Budget $${budget.toFixed(2)} < min $${config.filter.minBudget.toFixed(2)}`,
      calculation,
    };
  }

  if (budget > config.filter.maxBudget) {
    return {
      accept: false,
      reason: `Budget $${budget.toFixed(2)} > max $${config.filter.maxBudget.toFixed(2)}`,
      calculation,
    };
  }

  // Pricing constraint: accept only if budget covers our calculated price.
  // (In real SDK, this could be counter-offer depending on strategy; Standard playground models accept/reject.)
  if (budget < calculation.price) {
    const cost = calculation.cost;
    if (budget >= cost) {
      return {
        accept: false,
        reason: `Budget $${budget.toFixed(2)} below target price $${calculation.price.toFixed(2)} (could QUOTE at ${calculation.price.toFixed(2)})`,
        calculation,
      };
    }
    return {
      accept: false,
      reason: `Budget $${budget.toFixed(2)} below cost $${cost.toFixed(2)} (reject)`,
      calculation,
    };
  }

  return {
    accept: true,
    reason: `Accept at $${budget.toFixed(2)} (target price: $${calculation.price.toFixed(2)})`,
    calculation,
  };
}



