"use client";

import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";

type CostEstimate = {
  totalUSD: number;
  estimatedHours: number;
  baseRateUSD: number;
  breakdown: {
    lengthHours: number;
    titleHoursAdj?: number;
    descriptionHoursAdj?: number;
    tagMultiplier?: number;
    priorityMultiplier?: number;
  };
};

export function AICostEstimator() {
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [tagsText, setTagsText] = useState("");
  const [priority, setPriority] = useState<string>("normal");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [source, setSource] = useState<string | null>(null);
  const [estimate, setEstimate] = useState<CostEstimate | null>(null);
  const [notes, setNotes] = useState<string>("");

  const tags = tagsText
    .split(",")
    .map((t) => t.trim())
    .filter(Boolean);

  async function runEstimate() {
    setLoading(true);
    setError(null);
    setEstimate(null);
    setNotes("");
    setSource(null);
    try {
      const res = await fetch("/api/estimate-cost", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title, description, tags, priority }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data?.error || "Failed to estimate.");
      }
      setSource(data?.source || null);
      setEstimate(data?.estimate || null);
      setNotes(data?.notes || data?.details || "");
    } catch (e: any) {
      setError(e?.message || "Network error.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>AI Cost Estimator</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid gap-3 md:grid-cols-2">
          <div className="space-y-2">
            <label className="text-sm font-medium">Title</label>
            <Input
              placeholder="e.g., Design responsive React landing page"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
            />
          </div>
          <div className="space-y-2">
            <label className="text-sm font-medium">Priority</label>
            <Select value={priority} onValueChange={setPriority}>
              <SelectTrigger>
                <SelectValue placeholder="Select priority" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="normal">Normal</SelectItem>
                <SelectItem value="high">High</SelectItem>
                <SelectItem value="urgent">Urgent</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
        <div className="space-y-2">
          <label className="text-sm font-medium">Description</label>
          <Textarea
            placeholder="Briefly describe the task requirements, integrations, and constraints"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
          />
        </div>
        <div className="space-y-2">
          <label className="text-sm font-medium">Tags (comma separated)</label>
          <Input
            placeholder="e.g., Frontend, React, UI/UX"
            value={tagsText}
            onChange={(e) => setTagsText(e.target.value)}
          />
          <div className="flex flex-wrap gap-2">
            {tags.map((t) => (
              <Badge key={t} variant="secondary">{t}</Badge>
            ))}
          </div>
        </div>

        <div className="flex gap-2">
          <Button onClick={runEstimate} disabled={loading}>
            {loading ? "Estimating…" : "Estimate Cost"}
          </Button>
          {source && (
            <Badge variant={source === "ai" ? "default" : "outline"}>
              {source === "ai" ? "AI" : "Heuristic"}
            </Badge>
          )}
        </div>

        {error && (
          <div className="rounded-md border border-destructive/50 bg-destructive/10 p-3 text-sm">
            <div className="font-medium">Estimation error</div>
            <div className="text-muted-foreground">{error}</div>
            {notes && <div className="mt-2 text-muted-foreground">{notes}</div>}
          </div>
        )}

        {estimate && (
          <div className="mt-4 grid gap-3 md:grid-cols-3">
            <div className="rounded-lg border p-3">
              <div className="text-sm text-muted-foreground">Total (USD)</div>
              <div className="text-2xl font-bold">${estimate.totalUSD.toFixed(0)}</div>
            </div>
            <div className="rounded-lg border p-3">
              <div className="text-sm text-muted-foreground">Estimated Hours</div>
              <div className="text-2xl font-bold">{estimate.estimatedHours.toFixed(1)}h</div>
            </div>
            <div className="rounded-lg border p-3">
              <div className="text-sm text-muted-foreground">Base Rate</div>
              <div className="text-2xl font-bold">${estimate.baseRateUSD.toFixed(0)}/h</div>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
