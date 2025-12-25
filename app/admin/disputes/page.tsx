"use client";

import { useEffect, useState } from "react";
import { useWeb3 } from "@/components/web3-provider";
import { useFirebase } from "@/components/firebase-provider";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/components/ui/use-toast";
import { Loader2, ShieldAlert, Bot, Check, X, ExternalLink } from "lucide-react";
import { ethers } from "ethers";
import { resolveDispute } from "@/lib/escrow-contract"; // Updated import
import type { Task } from "@/lib/types";

const ADMIN_WALLET = "0xc5c7dbe83cc7fc43c6bf6138e98f4bde6442ba76";

export default function AdminDisputesPage() {
    const { account } = useWeb3();
    const { getAllTasks, updateTask } = useFirebase();
    const { toast } = useToast();

    const [disputedTasks, setDisputedTasks] = useState<Task[]>([]);
    const [loading, setLoading] = useState(true);
    const [analyzingIds, setAnalyzingIds] = useState<Record<string, boolean>>({});
    const [aiResults, setAiResults] = useState<Record<string, any>>({});
    const [processingId, setProcessingId] = useState<string | null>(null);

    useEffect(() => {
        if (account) {
            fetchDisputes();
        }
    }, [account]);

    const fetchDisputes = async () => {
        setLoading(true);
        try {
            const tasks = await getAllTasks();
            const disputes = tasks.filter(t => t.escrowStatus === "disputed");
            setDisputedTasks(disputes);
        } catch (e) {
            console.error("Failed to fetch disputes", e);
        } finally {
            setLoading(false);
        }
    };

    const runAIAnalysis = async (task: Task) => {
        setAnalyzingIds(prev => ({ ...prev, [task.id]: true }));
        try {
            const res = await fetch("/api/analyze-dispute", {
                method: "POST",
                body: JSON.stringify({
                    taskTitle: task.title,
                    taskDescription: task.description,
                    submissionContent: task.submission?.content || "No submission text",
                    disputeReason: "Dispute raised by user"
                })
            });
            const data = await res.json();
            setAiResults(prev => ({ ...prev, [task.id]: data }));
        } catch (e) {
            toast({ title: "AI Analysis Failed", variant: "destructive" });
        } finally {
            setAnalyzingIds(prev => ({ ...prev, [task.id]: false }));
        }
    };

    const resolveDisputeAction = async (task: Task, winner: "assignee" | "owner") => {
        if (!account) return;

        setProcessingId(task.id);
        try {
            // 1. Contract Call
            if (typeof window.ethereum !== 'undefined') {
                const provider = new ethers.BrowserProvider(window.ethereum);
                const signer = await provider.getSigner();

                // Determine winner address
                const winnerAddress = winner === "assignee" ? task.assigneeUid : task.userUid;
                if (!winnerAddress) throw new Error("Winner wallet address not found");

                const tx = await resolveDispute(signer, task.id, winnerAddress);
                await tx.wait();
            }

            // 2. Firestore Update
            await updateTask(task.id, {
                escrowStatus: winner === "assignee" ? "released" : "refunded",
                activeDisputeId: undefined, // Clear dispute
                status: winner === "assignee" ? "done" : "inprogress" // tailored logic
            });

            toast({ title: "Dispute Resolved", description: `Funds ${winner === "assignee" ? "released" : "refunded"}` });
            fetchDisputes(); // Refresh list

        } catch (e: any) {
            console.error(e);
            toast({ title: "Resolution Failed", description: e.message, variant: "destructive" });
        } finally {
            setProcessingId(null);
        }
    };

    if (account?.toLowerCase() !== ADMIN_WALLET.toLowerCase()) {
        return (
            <div className="flex h-screen items-center justify-center p-4 text-center">
                <div className="space-y-4">
                    <ShieldAlert className="mx-auto h-12 w-12 text-red-500" />
                    <h1 className="text-2xl font-bold">Access Denied</h1>
                    <p>Use wallet {ADMIN_WALLET} to access this page.</p>
                    <div className="text-muted-foreground text-sm">
                        Current: {account || "Not connected"}
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className="container mx-auto max-w-5xl py-10 space-y-8">
            <div>
                <h1 className="text-3xl font-bold">Dispute Resolution Console</h1>
                <p className="text-muted-foreground">Manage and resolve active disputes.</p>
            </div>

            {loading ? (
                <Loader2 className="h-8 w-8 animate-spin mx-auto" />
            ) : disputedTasks.length === 0 ? (
                <Card className="border-dashed p-10 text-center">
                    <p className="text-muted-foreground">No active disputes found.</p>
                </Card>
            ) : (
                <div className="grid gap-6">
                    {disputedTasks.map(task => (
                        <Card key={task.id}>
                            <CardHeader>
                                <div className="flex justify-between items-start">
                                    <div>
                                        <CardTitle>{task.title}</CardTitle>
                                        <CardDescription className="font-mono text-xs mt-1">{task.id}</CardDescription>
                                    </div>
                                    <Badge variant="destructive">Disputed</Badge>
                                </div>
                            </CardHeader>
                            <CardContent className="space-y-6">
                                <div className="grid md:grid-cols-2 gap-4">
                                    <div className="space-y-2 p-3 bg-muted/50 rounded-lg">
                                        <h3 className="font-semibold text-sm">Submission</h3>
                                        <p className="text-sm">{task.submission?.content || "No submission content"}</p>
                                    </div>
                                    <div className="space-y-2 p-3 bg-red-50 dark:bg-red-950/20 rounded-lg border border-red-100 dark:border-red-900">
                                        <h3 className="font-semibold text-sm text-red-600">Dispute Info</h3>
                                        <p className="text-sm">Status: <strong>Open</strong></p>
                                        {/* In real implementation, show 'Reason' here */}
                                    </div>
                                </div>

                                {/* AI Section */}
                                <div className="border-t pt-4">
                                    <div className="flex items-center justify-between mb-4">
                                        <div className="flex items-center gap-2">
                                            <Bot className="h-5 w-5 text-indigo-500" />
                                            <h3 className="font-medium">AI Arbitrator</h3>
                                        </div>
                                        <Button
                                            variant="outline"
                                            size="sm"
                                            onClick={() => runAIAnalysis(task)}
                                            disabled={analyzingIds[task.id]}
                                        >
                                            {analyzingIds[task.id] ? "Analyzing..." : "Analyze with AI"}
                                        </Button>
                                    </div>

                                    {aiResults[task.id] && (
                                        <div className="bg-indigo-50 dark:bg-indigo-950/30 p-4 rounded-lg text-sm space-y-2 animate-in fade-in slide-in-from-top-2">
                                            <p><strong>Analysis:</strong> {aiResults[task.id].analysis}</p>
                                            <p><strong>Recommendation:</strong> {aiResults[task.id].recommendation.toUpperCase()}</p>
                                            <Badge variant="secondary">Confidence: {aiResults[task.id].confidence}%</Badge>
                                        </div>
                                    )}
                                </div>

                                {/* Actions */}
                                <div className="flex justify-end gap-3 pt-4 border-t">
                                    <Button
                                        variant="outline"
                                        className="border-red-200 hover:bg-red-50 text-red-600"
                                        onClick={() => resolveDisputeAction(task, "owner")}
                                        disabled={!!processingId}
                                    >
                                        <X className="mr-2 h-4 w-4" />
                                        Refund Owner
                                    </Button>
                                    <Button
                                        className="bg-green-600 hover:bg-green-700"
                                        onClick={() => resolveDisputeAction(task, "assignee")}
                                        disabled={!!processingId}
                                    >
                                        <Check className="mr-2 h-4 w-4" />
                                        Release to Assignee
                                    </Button>
                                </div>
                            </CardContent>
                        </Card>
                    ))}
                </div>
            )}
        </div>
    );
}
