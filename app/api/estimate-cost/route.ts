import { NextRequest, NextResponse } from "next/server";
import { GoogleGenerativeAI } from "@google/generative-ai";
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

    // Compute a baseline heuristic to guide the model and use as fallback
    const baseline = estimateTaskCostUSD({ title, description, tags, priority });

    // Helpers defined at module scope

    // Fallback to heuristic if API key missing
    if (!process.env.GOOGLE_API_KEY && !process.env.GEMINI_API_KEY) {
      const rate = computeSuggestedBaseRate(Array.isArray(tags) ? tags : [], priority, title, description, baseline.estimatedHours);
      const hours = baseline.estimatedHours;
      const totalUSD = Math.max(0, Math.round(hours * rate));
      const estimate: CostEstimate = { ...baseline, baseRateUSD: rate, totalUSD };
      console.log("heuristic_no_key", { tags, priority, title, description, hours, rate });
      return NextResponse.json({ source: "heuristic", estimate }, { status: 200 });
    }

    const apiKey = process.env.GOOGLE_API_KEY || process.env.GEMINI_API_KEY;
    const genAI = new GoogleGenerativeAI(apiKey!);

    const modelName = process.env.GEMINI_MODEL || "gemini-2.0-flash-exp";
    const model = genAI.getGenerativeModel({ model: modelName });

    const prompt = `You are a seasoned engineering project estimator. Given a task title, description, tags, and priority, produce an unbiased estimate that VARIES with task complexity and skills required.

Output STRICT JSON (no prose) that matches this schema:
{
  "totalUSD": number,
  "estimatedHours": number,
  "baseRateUSD": number,
  "breakdown": {
    "lengthHours": number,
    "titleKeywordHours": number,
    "descriptionKeywordHours": number,
    "tagsMultiplier": number,
    "priorityMultiplier": number
  },
  "notes": string
}

Guidance to ensure dynamic estimates:
- Derive hours from complexity signals: specificity, number of steps/requirements, integrations, unknowns, and risk.
- Select baseRateUSD based on skills indicated by tags/keywords and urgency. Use ranges: 
  • Blockchain/Solidity/Security/Cryptography: 90–140
  • AI/ML/Large Models/Data Science: 80–130
  • Backend/API/Infrastructure: 60–100
  • Frontend/UI/React/Design Systems: 50–85
  • DevOps/Cloud/CI/CD: 60–100
  • QA/Testing: 40–60
  • Documentation/Research: 35–55
- Adjust for priority: multiply hours by 1.0 (normal), 1.15 (high), 1.35 (urgent) and increase baseRateUSD by 0% (normal), +10% (high), +25% (urgent).
- Reflect tags with a multiplier for complexity (e.g., security or blockchain tasks tend to have higher multipliers).
- Avoid extremes but do NOT return constant values; vary with inputs.
- Always return plausible values > 0.

Task details:
Title: ${title}
Description: ${description}
Tags: ${Array.isArray(tags) ? tags.join(", ") : ""}
Priority: ${priority ?? "normal"}

Baseline heuristic (for guidance only, feel free to refine): ${JSON.stringify(baseline)}

Return JSON only.`;

    const result = await model.generateContent({
      contents: [{ role: "user", parts: [{ text: prompt }] }],
      generationConfig: {
        temperature: 0.1,
        responseMimeType: "application/json",
      },
    });

    const response = await result.response;
    const content = response.text();

    let parsed: any;
    try {
      const cleaned = content.trim().replace(/^```json\s*/i, "").replace(/```$/i, "");
      parsed = JSON.parse(cleaned);
    } catch (e) {
      const rate = computeSuggestedBaseRate(Array.isArray(tags) ? tags : [], priority, title, description, baseline.estimatedHours);
      const hours = baseline.estimatedHours;
      const totalUSD = Math.max(0, Math.round(hours * rate));
      const fallback = { ...baseline, baseRateUSD: rate, totalUSD } satisfies CostEstimate;
      return NextResponse.json({ source: "heuristic", estimate: fallback, error: "parse_failed" }, { status: 200 });
    }

    // Enforce dynamic base rate derived from tags/priority/title/description complexity, and keep AI hours
    const hours = Number(parsed.estimatedHours ?? baseline.estimatedHours ?? 0);
    const suggestedRate = computeSuggestedBaseRate(Array.isArray(tags) ? tags : [], priority, title, description, hours);
    const totalUSD = Math.max(0, Math.round(hours * suggestedRate));

    const breakdown = parsed.breakdown ?? {};
    const estimate: CostEstimate = {
      totalUSD,
      estimatedHours: hours,
      baseRateUSD: suggestedRate,
      breakdown: {
        lengthHours: Number(breakdown.lengthHours ?? baseline.breakdown.lengthHours ?? 0),
        titleHoursAdj: Number(
          breakdown.titleKeywordHours ??
            breakdown.titleHoursAdj ??
            baseline.breakdown.titleHoursAdj ??
            0
        ),
        descriptionHoursAdj: Number(
          breakdown.descriptionKeywordHours ??
            breakdown.descriptionHoursAdj ??
            baseline.breakdown.descriptionHoursAdj ??
            0
        ),
        tagMultiplier: Number(
          breakdown.tagsMultiplier ??
            breakdown.tagMultiplier ??
            baseline.breakdown.tagMultiplier ??
            1
        ),
        priorityMultiplier: Number(
          breakdown.priorityMultiplier ??
            baseline.breakdown.priorityMultiplier ??
            1
        ),
      },
    };

    return NextResponse.json({ source: "ai", estimate, notes: parsed.notes ?? "" }, { status: 200 });
  } catch (err) {
    // Log full Gemini error so we can diagnose precisely
    const errorMsg = (err as any)?.message ?? String(err);
    const errorStack = (err as any)?.stack ?? undefined;
    console.error("gemini_error", { message: errorMsg, stack: errorStack });

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
      console.log("heuristic_ai_error", { tags, priority, title, description, hours, rate });
      return NextResponse.json({ source: "heuristic", estimate: fallback, error: "ai_error", details: errorMsg }, { status: 200 });
    } catch {
      return NextResponse.json({ error: "failed" }, { status: 500 });
    }
  }
}