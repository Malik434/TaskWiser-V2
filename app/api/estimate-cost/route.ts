import { NextRequest, NextResponse } from "next/server";
import OpenAI from "openai";
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
    if (!process.env.OPENAI_API_KEY) {
      const rate = computeSuggestedBaseRate(Array.isArray(tags) ? tags : [], priority, title, description, baseline.estimatedHours);
      const hours = baseline.estimatedHours;
      const totalUSD = Math.max(0, Math.round(hours * rate));
      const estimate: CostEstimate = { ...baseline, baseRateUSD: rate, totalUSD };
      console.log("heuristic_no_key", { tags, priority, title, description, hours, rate });
      return NextResponse.json({ source: "heuristic", estimate }, { status: 200 });
    }

    const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

    const system = `You are a seasoned engineering project estimator. Given a task title, description, tags, and priority, produce an unbiased estimate that VARIES with task complexity and skills required.\n\nOutput STRICT JSON (no prose) that matches this schema:\n{\n  "totalUSD": number,\n  "estimatedHours": number,\n  "baseRateUSD": number,\n  "breakdown": {\n    "lengthHours": number,\n    "titleKeywordHours": number,\n    "descriptionKeywordHours": number,\n    "tagsMultiplier": number,\n    "priorityMultiplier": number\n  },\n  "notes": string\n}\n\nGuidance to ensure dynamic estimates:\n- Derive hours from complexity signals: specificity, number of steps/requirements, integrations, unknowns, and risk.\n- Select baseRateUSD based on skills indicated by tags/keywords and urgency. Use ranges: \n  • Blockchain/Solidity/Security/Cryptography: 90–140\n  • AI/ML/Large Models/Data Science: 80–130\n  • Backend/API/Infrastructure: 60–100\n  • Frontend/UI/React/Design Systems: 50–85\n  • DevOps/Cloud/CI/CD: 60–100\n  • QA/Testing: 40–60\n  • Documentation/Research: 35–55\n- Adjust for priority: multiply hours by 1.0 (normal), 1.15 (high), 1.35 (urgent) and increase baseRateUSD by 0% (normal), +10% (high), +25% (urgent).\n- Reflect tags with a multiplier for complexity (e.g., security or blockchain tasks tend to have higher multipliers).\n- Avoid extremes but do NOT return constant values; vary with inputs.\n- Always return plausible values > 0.\n`;

    const user = `Task details:\nTitle: ${title}\nDescription: ${description}\nTags: ${Array.isArray(tags) ? tags.join(", ") : ""}\nPriority: ${priority ?? "normal"}\n\nBaseline heuristic (for guidance only, feel free to refine): ${JSON.stringify(baseline)}\n\nReturn JSON only.`;

    const completion = await openai.chat.completions.create({
      model: process.env.OPENAI_MODEL || "gpt-4o-mini",
      messages: [
        { role: "system", content: system },
        { role: "user", content: user },
      ],
      temperature: 0.1,
      response_format: { type: "json_object" },
    });

    const content = completion.choices?.[0]?.message?.content ?? "";

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

    const estimate: CostEstimate = {
      totalUSD,
      estimatedHours: hours,
      baseRateUSD: suggestedRate,
      breakdown: {
        lengthHours: Number(parsed.breakdown?.lengthHours ?? 0),
        titleKeywordHours: Number(parsed.breakdown?.titleKeywordHours ?? 0),
        descriptionKeywordHours: Number(parsed.breakdown?.descriptionKeywordHours ?? 0),
        tagsMultiplier: Number(parsed.breakdown?.tagsMultiplier ?? 1),
        priorityMultiplier: Number(parsed.breakdown?.priorityMultiplier ?? 1),
      },
    };

    return NextResponse.json({ source: "ai", estimate, notes: parsed.notes ?? "" }, { status: 200 });
  } catch (err) {
    // Log full OpenAI error so we can diagnose precisely
    const errorMsg = (err as any)?.message ?? String(err);
    const errorStack = (err as any)?.stack ?? undefined;
    console.error("openai_error", { message: errorMsg, stack: errorStack });

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
