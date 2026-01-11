import { NextRequest, NextResponse } from "next/server";
import { estimateTaskCostUSD, type CostEstimate } from "@/lib/cost-estimator";

// Helpers moved to module scope so both try/catch blocks can use them
const deriveCategoryBase = (rawTags: string[] = [], t: string, d: string): number => {
  const tagsLower = (rawTags || []).map((x) => x.toLowerCase());
  const text = `${t} ${d}`.toLowerCase();
  const hasAnyTag = (list: string[]) => list.some((kw) => tagsLower.includes(kw));
  const hasAnyText = (list: string[]) => list.some((kw) => text.includes(kw));

  if (
    hasAnyTag(["smart contracts", "solidity", "security", "cryptography", "protocol design", "blockchain"]) ||
    hasAnyText(["smart contract", "solidity", "reentrancy", "security", "audit", "protocol", "cryptograph"])
  ) {
    return 110;
  }
  if (
    hasAnyTag(["ai/ml", "ai", "ml", "machine learning", "data science"]) ||
    hasAnyText(["ai", "ml", "machine learning", "llm", "model", "training", "fine-tune", "pytorch", "tensorflow"])
  ) {
    return 100;
  }
  if (
    hasAnyTag(["backend", "api", "infrastructure", "cloud", "devops"]) ||
    hasAnyText(["backend", "api", "server", "database", "aws", "gcp", "kubernetes", "docker"])
  ) {
    return 85;
  }
  if (
    hasAnyTag(["frontend", "react", "ui/ux", "design"]) ||
    hasAnyText(["frontend", "react", "ui", "ux", "design", "typescript", "tailwind"])
  ) {
    return 65;
  }
  if (
    hasAnyTag(["qa", "testing", "documentation", "technical writing", "research", "translation", "community", "marketing", "growth"]) ||
    hasAnyText(["test", "qa", "documentation", "docs", "write", "research", "translate", "community", "marketing", "growth"])
  ) {
    return 45;
  }
  return 60;
};

const complexityBump = (hours: number): number => {
  if (hours >= 14) return 20;
  if (hours >= 10) return 10;
  if (hours >= 7) return 5;
  return 0;
};

const computeSuggestedBaseRate = (
  rawTags: string[] = [],
  prio: string = "normal",
  t: string,
  d: string,
  hours: number,
): number => {
  const base = deriveCategoryBase(rawTags, t, d);
  const bump = complexityBump(hours);
  const p = (prio || "normal").toLowerCase();
  const multiplier = p === "urgent" ? 1.25 : p === "high" ? 1.1 : 1.0;
  return Math.round((base + bump) * multiplier);
};

export async function POST(req: NextRequest) {
  // Read body once and reuse in both try/catch paths to avoid stream re-consumption
  const body = await req.json().catch(() => ({}));
  try {
    const { title = "", description = "", tags = [], priority = "normal" } = body || {};
    // NEW: return zero estimate when absolutely nothing meaningful is passed
    const cleanedTags = Array.isArray(tags)
    ? tags.filter(t => typeof t === "string" && t.trim() !== "")
    : [];
  
  const allEmpty =
    (!title || title.trim() === "") &&
    (!description || description.trim() === "") &&
    cleanedTags.length === 0;

  if (allEmpty) {
    const response = NextResponse.json({
      source: "empty",
      estimate: {
        totalUSD: 0,
        estimatedHours: 0,
        baseRateUSD: 0,
        breakdown: {
          lengthHours: 0,
          titleHoursAdj: 0,
          descriptionHoursAdj: 0,
          tagMultiplier: 1,
          priorityMultiplier: 1,
        },
        notes: "No information provided — defaulting to zero estimate."
      }
    }, { status: 200 });
    response.headers.set('Cache-Control', 'no-cache, must-revalidate');
    response.headers.set('X-Content-Type-Options', 'nosniff');
    return response;
  }
    
    // Compute a baseline heuristic to guide the model and use as fallback
    const baseline = estimateTaskCostUSD({ title, description, tags, priority });

    // Try calling the local Python ML API
    try {
      const mlResponse = await fetch("http://127.0.0.1:3000/predict", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title,
          description,
          tags: Array.isArray(tags) ? tags : []
        }),
      });

      if (!mlResponse.ok) {
        throw new Error(`ML API error: ${mlResponse.statusText}`);
      }

      const mlData = await mlResponse.json();
      const predictedTotalUSD = mlData.predicted_cost;

      // Reverse engineer the breakdown from the total cost
      // We keep the heuristic base rate logic as it depends on skill/complexity
      // and adjust the hours to match the ML's total cost.
      
      const suggestedRate = computeSuggestedBaseRate(Array.isArray(tags) ? tags : [], priority, title, description, baseline.estimatedHours);
      
      // Ensure rate is at least 1 to avoid division by zero
      const safeRate = Math.max(1, suggestedRate);
      
      const adjustedHours = Math.round((predictedTotalUSD / safeRate) * 10) / 10;
      
      const estimate: CostEstimate = {
        totalUSD: predictedTotalUSD,
        estimatedHours: adjustedHours,
        baseRateUSD: safeRate,
        breakdown: {
          ...baseline.breakdown,
          lengthHours: adjustedHours, // Simplified attribution
        },
      };

      const httpResponse = NextResponse.json({ 
        source: "ml_model", 
        estimate, 
        notes: "Estimate generated by custom ML model trained on historical data." 
      }, { status: 200 });
      
      httpResponse.headers.set('Cache-Control', 'no-cache, must-revalidate');
      httpResponse.headers.set('X-Content-Type-Options', 'nosniff');
      return httpResponse;

    } catch (mlError) {
      console.error("ML Model failed, falling back to heuristic:", mlError);
      // Fallback to heuristic
      const rate = computeSuggestedBaseRate(Array.isArray(tags) ? tags : [], priority, title, description, baseline.estimatedHours);
      const hours = baseline.estimatedHours;
      const totalUSD = Math.max(0, Math.round(hours * rate));
      const estimate: CostEstimate = { ...baseline, baseRateUSD: rate, totalUSD };
      
      const response = NextResponse.json({ 
        source: "heuristic", 
        estimate, 
        notes: "ML model unavailable, using heuristic estimate." 
      }, { status: 200 });
      response.headers.set('Cache-Control', 'no-cache, must-revalidate');
      response.headers.set('X-Content-Type-Options', 'nosniff');
      return response;
    }

  } catch (err) {

    try {
      const { title = "", description = "", tags = [], priority = "normal" } = body || {};
      const baseline = estimateTaskCostUSD({ title, description, tags, priority });
      const rate = (() => {
        const base = deriveCategoryBase(Array.isArray(tags) ? tags : [], title, description);
        const bump = (baseline.estimatedHours >= 14) ? 20 : (baseline.estimatedHours >= 10) ? 10 : (baseline.estimatedHours >= 7) ? 5 : 0;
        const p = (priority || "normal").toLowerCase();
        const m = p === "urgent" ? 1.25 : p === "high" ? 1.1 : 1.0;
        return Math.round((base + bump) * m);
      })();
      const hours = baseline.estimatedHours;
      const totalUSD = Math.max(0, Math.round(hours * rate));
      const fallback = { ...baseline, baseRateUSD: rate, totalUSD } satisfies CostEstimate;
      console.log("heuristic_error", { tags, priority, title, description, hours, rate });
      const response = NextResponse.json({ source: "heuristic", estimate: fallback, error: "processing_error"}, { status: 200 });
      response.headers.set('Cache-Control', 'no-cache, must-revalidate');
      response.headers.set('X-Content-Type-Options', 'nosniff');
      return response;
    } catch {
      const response = NextResponse.json({ error: "failed" }, { status: 500 });
      response.headers.set('Cache-Control', 'no-cache, must-revalidate');
      response.headers.set('X-Content-Type-Options', 'nosniff');
      return response;
    }
  }
}