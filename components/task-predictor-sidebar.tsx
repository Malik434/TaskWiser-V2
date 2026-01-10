"use client";

import { useMemo, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { estimateTaskCostUSD, type CostEstimate as HeuristicEstimate } from "@/lib/cost-estimator";
import type { UserProfile } from "@/lib/types";

type Props = {
  newTask: { title?: string; description?: string; priority?: string };
  availableUsers: UserProfile[];
  onApplyReward?: (amount: number) => void;
};

type CostEstimate = {
  totalUSD: number;
  estimatedHours: number;
  baseRateUSD: number;
};

function extractKeywords(text: string) {
  const base = (text || "").toLowerCase();
  const keywords = [
    "frontend",
    "backend",
    "full stack",
    "smart contracts",
    "security",
    "ui/ux",
    "design",
    "react",
    "protocol",
    "devops",
    "data",
    "analytics",
    "mobile",
    "documentation",
  ];
  return keywords.filter((k) => base.includes(k));
}

function matchContributors(users: UserProfile[], keywords: string[]) {
  if (!keywords.length) return [];
  const lower = keywords.map((k) => k.toLowerCase());
  const scored = users.map((u) => {
    const specs = (u.specialties || []).map((s) => s.toLowerCase());
    const score = lower.reduce((acc, kw) => (specs.some((s) => s.includes(kw)) ? acc + 1 : acc), 0);
    return { user: u, score };
  });
  return scored
    .filter((s) => s.score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, 3)
    .map((s) => s.user);
}

export function TaskPredictorSidebar({ newTask, availableUsers, onApplyReward }: Props) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [source, setSource] = useState<string | null>(null);
  const [estimate, setEstimate] = useState<CostEstimate | null>(null);
  const [heuristic, setHeuristic] = useState<HeuristicEstimate | null>(null);
  const [useAI, setUseAI] = useState(false);

  const keywords = useMemo(
    () => extractKeywords(`${newTask.title || ""} ${newTask.description || ""}`),
    [newTask.title, newTask.description]
  );
  const suggestedContributors = useMemo(() => matchContributors(availableUsers, keywords), [availableUsers, keywords]);

  async function runEstimate() {
    setLoading(true);
    setError(null);
    setEstimate(null);
    setHeuristic(null);
    setSource(null);
    try {
      if (useAI) {
        const res = await fetch("/api/estimate-cost", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            title: newTask.title || "",
            description: newTask.description || "",
            tags: keywords,
            priority: (newTask.priority as any) || "normal",
          }),
        });
        const data = await res.json();
        if (!res.ok) {
          setError(data?.error || "Failed to estimate.");
        }
        setSource(data?.source || (data?.ai_error ? "heuristic" : "ai"));
        const e = data?.estimate;
        if (e && typeof e.totalUSD === "number" && typeof e.estimatedHours === "number") {
          setEstimate({ totalUSD: e.totalUSD, estimatedHours: e.estimatedHours, baseRateUSD: e.baseRateUSD || 50 });
        }
      } else {
        const h = estimateTaskCostUSD({
          title: newTask.title || "",
          description: newTask.description || "",
          tags: keywords,
          priority: (newTask.priority as any) || "normal",
        });
        setHeuristic(h);
        setSource("heuristic");
        setEstimate({ totalUSD: h.totalUSD, estimatedHours: h.estimatedHours, baseRateUSD: h.baseRateUSD });
      }
    } catch (e: any) {
      setError(e?.message || "Network error.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>AI Predictors</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex items-center justify-between">
          <div className="text-sm font-medium">Estimated Cost (USD)</div>
          <div className="flex items-center gap-2">
            <Label htmlFor="use-ai" className="text-xs">Use AI</Label>
            <Switch id="use-ai" checked={useAI} onCheckedChange={setUseAI} />
            <Badge variant="outline" className="text-xs">Real-time</Badge>
          </div>
        </div>

        <div className="flex gap-2">
          <Button onClick={runEstimate} disabled={loading} variant="outline">
            {loading ? "Estimating…" : "Run Estimate"}
          </Button>
          {source && (
            <Badge variant={source === "ai" ? "default" : "outline"}>{source === "ai" ? "AI" : "Heuristic"}</Badge>
          )}
          {estimate && onApplyReward && (
            <Button
              size="sm"
              onClick={() => onApplyReward(Math.round(estimate.totalUSD))}
              title="Apply estimated amount to bounty"
            >
              Apply to Bounty
            </Button>
          )}
        </div>

        {error && (
          <div className="rounded-md border border-destructive/50 bg-destructive/10 p-3 text-sm">
            <div className="font-medium">Estimation error</div>
            <div className="text-muted-foreground">{error}</div>
          </div>
        )}

        {useAI ? (
          <div className="grid gap-3">
            <div className="rounded-lg border p-3">
              <div className="text-2xl font-bold">${estimate ? Math.round(estimate.totalUSD).toLocaleString() : "0"}</div>
              <div className="text-xs text-muted-foreground">{estimate ? estimate.estimatedHours.toFixed(1) : "0.0"}h @ ${estimate?.baseRateUSD ?? 50}/h</div>
            </div>
          </div>
        ) : (
          <div className="grid gap-3">
            <div className="rounded-lg border p-3">
              <div className="text-2xl font-bold">${heuristic ? heuristic.totalUSD.toLocaleString() : "0"}</div>
              <div className="text-xs text-muted-foreground">{heuristic ? heuristic.estimatedHours.toFixed(1) : "0.0"}h @ ${heuristic?.baseRateUSD ?? 50}/h</div>
            </div>
            <div className="mt-2 grid grid-cols-2 gap-2 text-xs">
              <div className="rounded-md border p-2">
                <div className="font-medium">Length</div>
                <div className="text-muted-foreground">{heuristic?.breakdown.lengthHours ?? 0}h</div>
              </div>
              <div className="rounded-md border p-2">
                <div className="font-medium">Title</div>
                <div className="text-muted-foreground">+{heuristic?.breakdown.titleHoursAdj ?? 0}h</div>
              </div>
              <div className="rounded-md border p-2">
                <div className="font-medium">Description</div>
                <div className="text-muted-foreground">+{heuristic?.breakdown.descriptionHoursAdj ?? 0}h</div>
              </div>
              <div className="rounded-md border p-2">
                <div className="font-medium">Tags</div>
                <div className="text-muted-foreground">x{heuristic?.breakdown.tagMultiplier ?? 1}</div>
              </div>
              <div className="rounded-md border p-2">
                <div className="font-medium">Priority</div>
                <div className="text-muted-foreground">x{heuristic?.breakdown.priorityMultiplier ?? 1}</div>
              </div>
            </div>
          </div>
        )}

        <div className="space-y-2">
          <div className="text-sm font-medium">Contributor Suggestions</div>
          {suggestedContributors.length === 0 ? (
            <div className="text-sm text-muted-foreground">No matches yet. Add more details or keywords.</div>
          ) : (
            <div className="flex flex-col gap-2">
              {suggestedContributors.map((u) => (
                <div key={u.id} className="flex items-center gap-3 rounded-md border p-2">
                  <Avatar className="h-8 w-8">
                    <AvatarImage src={u.profilePicture || "/placeholder.svg"} alt={u.username} />
                    <AvatarFallback>{(u.username || "").slice(0, 2).toUpperCase() || "US"}</AvatarFallback>
                  </Avatar>
                  <div className="flex-1">
                    <div className="text-sm font-medium">{u.username || u.address.slice(0, 6)}</div>
                    {u.specialties && u.specialties.length > 0 && (
                      <div className="text-xs text-muted-foreground">{u.specialties.slice(0, 3).join(", ")}</div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}