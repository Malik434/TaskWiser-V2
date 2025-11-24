// Heuristic cost estimator for tasks, based on title, description, tags, and priority.
// Returns a USD estimate, hours estimate, and a simple breakdown for UI.

export type CostEstimate = {
  totalUSD: number;
  estimatedHours: number;
  baseRateUSD: number;
  breakdown: {
    lengthHours: number;
    titleHoursAdj: number;
    descriptionHoursAdj: number;
    tagMultiplier: number;
    priorityMultiplier: number;
  };
};

const BASE_RATE_USD = 50; // assumed hourly rate

const TAG_WEIGHTS: Record<string, number> = {
  // High complexity
  "Smart Contracts": 0.5,
  "Security": 0.5,
  "AI/ML": 0.45,
  "Protocol Design": 0.5,
  "Backend": 0.4,
  "DevOps": 0.4,
  "Data Science": 0.4,
  "Cloud": 0.4,
  // Medium
  "Full Stack": 0.35,
  "Frontend": 0.3,
  "Mobile": 0.3,
  "Analytics": 0.3,
  "Governance": 0.25,
  "Research": 0.25,
  // Lower
  "UI/UX": 0.2,
  "Design": 0.2,
  "Documentation": 0.15,
  "Technical Writing": 0.15,
  "Translation": 0.15,
  "Marketing": 0.15,
  "Growth": 0.15,
  "Community": 0.1,
  "Social Media": 0.1,
  "Writing": 0.1,
  "Content": 0.1,
  "Legal": 0.15,
  "DAO Operations": 0.15,
  "Treasury": 0.2,
  "Partnerships": 0.15,
  "Video": 0.15,
  "Product Management": 0.2,
};

const TITLE_KEYWORD_HOURS: Record<string, number> = {
  // increases hours based on likely complexity
  "integration": 2,
  "integrate": 2,
  "deploy": 1.5,
  "deployment": 1.5,
  "audit": 4,
  "security": 3,
  "optimiz": 2.5, // optimize/optimization
  "refactor": 2,
  "research": 1.5,
  "analytics": 1,
  "api": 1.5,
  "smart contract": 3,
  "protocol": 3,
  "migrate": 2,
  "migration": 2,
};

const DESCRIPTION_KEYWORD_HOURS: Record<string, number> = {
  "setup": 1,
  "configure": 1,
  "testing": 1.5,
  "unit test": 1.5,
  "e2e": 1.5,
  "performance": 2,
  "database": 2,
  "index": 1.5,
  "caching": 1.5,
};

function countWords(text: string): number {
  return (text || "")
    .trim()
    .split(/\s+/)
    .filter(Boolean).length;
}

function hoursFromLength(description: string): number {
  const words = countWords(description);
  if (words <= 20) return 1.5;
  if (words <= 80) return 3.5;
  if (words <= 200) return 6.5;
  return 10; // long and detailed
}

function titleHoursAdj(title: string): number {
  const t = (title || "").toLowerCase();
  let adj = 0;

  // Baseline based on title length to ensure some contribution even without keywords
  const words = countWords(title || "");
  if (words >= 6) adj += 1.0; // longer, likely more involved
  else if (words >= 3) adj += 0.5; // moderately descriptive

  // Keyword-based adjustments for known complexity indicators
  for (const key of Object.keys(TITLE_KEYWORD_HOURS)) {
    if (t.includes(key)) adj += TITLE_KEYWORD_HOURS[key];
  }

  return adj;
}

function descriptionHoursAdj(description: string): number {
  const d = (description || "").toLowerCase();
  let adj = 0;
  for (const key of Object.keys(DESCRIPTION_KEYWORD_HOURS)) {
    if (d.includes(key)) adj += DESCRIPTION_KEYWORD_HOURS[key];
  }
  return adj;
}

function tagMultiplier(tags: string[] | undefined): number {
  if (!tags || tags.length === 0) return 0;
  let sum = 0;
  for (const tag of tags) {
    const weight = TAG_WEIGHTS[tag] ?? 0.1; // default small bump if unknown tag
    sum += weight;
  }
  // Cap total multiplier to avoid extremes
  return Math.min(sum, 1.0);
}

function priorityMultiplier(priority: string | undefined): number {
  switch ((priority || "medium").toLowerCase()) {
    case "high":
      return 1.2; // +20%
    case "low":
      return 0.9; // -10%
    default:
      return 1.0;
  }
}

export function estimateTaskCostUSD(params: {
  title: string;
  description: string;
  tags?: string[];
  priority?: string;
  baseRateUSD?: number;
}): CostEstimate {
  const rate = params.baseRateUSD ?? BASE_RATE_USD;
  const lengthH = hoursFromLength(params.description || "");
  const titleAdj = titleHoursAdj(params.title || "");
  const descAdj = descriptionHoursAdj(params.description || "");
  const tagMult = tagMultiplier(params.tags);
  const prioMult = priorityMultiplier(params.priority);

  const rawHours = lengthH + titleAdj + descAdj;
  const hoursWithTags = rawHours * (1 + tagMult);
  const finalHours = hoursWithTags * prioMult;

  const totalUSD = Math.max(0, Math.round(finalHours * rate));

  return {
    totalUSD,
    estimatedHours: Number(finalHours.toFixed(1)),
    baseRateUSD: rate,
    breakdown: {
      lengthHours: Number(lengthH.toFixed(1)),
      titleHoursAdj: Number(titleAdj.toFixed(1)),
      descriptionHoursAdj: Number(descAdj.toFixed(1)),
      tagMultiplier: Number(tagMult.toFixed(2)),
      priorityMultiplier: Number(prioMult.toFixed(2)),
    },
  };
}
