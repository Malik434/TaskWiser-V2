
import React, { useState, useEffect } from "react";
import { Loader2, AlertCircle, Wand2, DollarSign, Clock } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";

// Assuming CostEstimate type matches what was used in kanban-board or defining a localized one if lib is unavailable
// But kanban-board imported it, so it should exist.
// If not, we define a compatible interface.

export interface CostEstimate {
    totalUSD: number;
    estimatedHours: number;
    complexity: "Low" | "Medium" | "High";
    explanation?: string;
    breakdown?: {
        item: string;
        cost: number;
    }[];
}

interface TaskPredictorSidebarProps {
    title: string;
    description: string;
    onEstimateComplete?: (estimate: CostEstimate) => void;
}

export function TaskPredictorSidebar({ title, description, onEstimateComplete }: TaskPredictorSidebarProps) {
    const [estimate, setEstimate] = useState<CostEstimate | null>(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        // Debounce estimation
        if (!title && !description) return;

        const timer = setTimeout(async () => {
            setLoading(true);
            setError(null);

            try {
                // Mocking the payload structure based on observation
                const payload = {
                    title,
                    description,
                    // Add other fields if needed
                };

                const res = await fetch("/api/estimate-cost", {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify(payload),
                });

                if (!res.ok) throw new Error("Estimation failed");

                const data = await res.json();

                if (data && data.estimate) {
                    setEstimate(data.estimate);
                    if (onEstimateComplete) onEstimateComplete(data.estimate);
                } else {
                    // Handle specific API error format if known, else generic
                    throw new Error("Invalid response format");
                }

            } catch (err) {
                console.error("AI Estimation Error:", err);
                setError("Could not generate estimate.");
            } finally {
                setLoading(false);
            }
        }, 800);

        return () => clearTimeout(timer);
    }, [title, description, onEstimateComplete]);

    if (!title && !description) {
        return (
            <div className="flex flex-col items-center justify-center p-6 text-center text-muted-foreground h-40">
                <Wand2 className="h-8 w-8 mb-2 opacity-20" />
                <p className="text-sm">Enter task details to generate AI estimate.</p>
            </div>
        );
    }

    return (
        <div className="space-y-4 animate-in fade-in slide-in-from-right-2 duration-500">
            {loading ? (
                <div className="flex flex-col items-center justify-center p-8 space-y-3">
                    <Loader2 className="h-6 w-6 animate-spin text-purple-500" />
                    <p className="text-xs text-muted-foreground font-medium animate-pulse">Analyzing task requirements...</p>
                </div>
            ) : error ? (
                <div className="flex items-center gap-2 p-3 text-sm text-red-600 bg-red-50 dark:bg-red-900/10 rounded-lg border border-red-100 dark:border-red-900/30">
                    <AlertCircle className="h-4 w-4 shrink-0" />
                    <p>{error}</p>
                </div>
            ) : estimate ? (
                <Card className="border-purple-100 dark:border-purple-900/30 bg-white/50 dark:bg-slate-900/50 shadow-sm">
                    <CardHeader className="p-4 pb-2">
                        <CardTitle className="text-sm font-medium flex items-center gap-2">
                            <Wand2 className="h-3 w-3 text-purple-500" />
                            AI Estimate
                        </CardTitle>
                    </CardHeader>
                    <CardContent className="p-4 space-y-4">
                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <div className="text-xs text-muted-foreground mb-1">Cost</div>
                                <div className="text-lg font-bold text-slate-900 dark:text-slate-100 flex items-center">
                                    <span className="text-xs mr-0.5">$</span>
                                    {estimate.totalUSD?.toLocaleString() ?? "0"}
                                </div>
                            </div>
                            <div>
                                <div className="text-xs text-muted-foreground mb-1">Time</div>
                                <div className="text-lg font-bold text-slate-900 dark:text-slate-100 flex items-center">
                                    {estimate.estimatedHours ?? 0}
                                    <span className="text-xs ml-1 font-normal text-muted-foreground">hrs</span>
                                </div>
                            </div>
                        </div>

                        <Separator />

                        <div>
                            <div className="text-xs text-muted-foreground mb-2">Complexity</div>
                            <Badge variant={
                                estimate.complexity === "High" ? "destructive" :
                                    estimate.complexity === "Medium" ? "default" : "secondary"
                            }>
                                {estimate.complexity || "Unknown"}
                            </Badge>
                        </div>

                        {estimate.explanation && (
                            <div className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed bg-slate-50 dark:bg-black/20 p-2 rounded">
                                {estimate.explanation}
                            </div>
                        )}
                    </CardContent>
                </Card>
            ) : null}
        </div>
    );
}
