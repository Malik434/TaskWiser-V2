"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { WalletConnect } from "@/components/wallet-connect";
import { ThemeToggle } from "@/components/theme-toggle";
import { useWeb3 } from "@/components/web3-provider";
import { useFirebase } from "@/components/firebase-provider";
import { ProtectedRoute } from "@/components/protected-route";
import type { Dispute, Task } from "@/lib/types";
import { Shield, Loader2, AlertCircle, CheckCircle, XCircle, FileText, ExternalLink, ArrowLeft, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { useToast } from "@/components/ui/use-toast";
import { retrieveEscrow, releaseEscrowByAdmin, getEscrowDetails, EscrowStatus } from "@/lib/escrow-contract";
import { ethers } from "ethers";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";

const ADMIN_ADDRESS = "0xc5c7dbe83cc7fc43c6bf6138e98f4bde6442ba76";

export default function AdminPage() {
  const { account, isConnected, signer, provider } = useWeb3();
  const { getDisputes, updateDispute, getAllTasks } = useFirebase();
  const { toast } = useToast();
  const router = useRouter();

  const [isClient, setIsClient] = useState(false);
  const [disputes, setDisputes] = useState<Dispute[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isAdmin, setIsAdmin] = useState(false);
  const [processingDispute, setProcessingDispute] = useState<string | null>(null);
  const [tasks, setTasks] = useState<Record<string, Task>>({});

  useEffect(() => {
    setIsClient(true);
  }, []);

  useEffect(() => {
    if (isClient && account) {
      checkAdminAccess();
      loadDisputes();
      loadTasks();
    }
  }, [isClient, account, isConnected]);

  const checkAdminAccess = () => {
    if (!account) {
      setIsAdmin(false);
      return;
    }
    const normalizedAccount = account.toLowerCase();
    const normalizedAdmin = ADMIN_ADDRESS.toLowerCase();
    setIsAdmin(normalizedAccount === normalizedAdmin);
  };

  const loadTasks = async () => {
    try {
      const allTasks = await getAllTasks();
      const taskMap: Record<string, Task> = {};
      allTasks.forEach((task: Task) => {
        taskMap[task.id] = task;
      });
      setTasks(taskMap);
    } catch (error) {
      console.error("Error loading tasks:", error);
    }
  };

  const loadDisputes = async () => {
    try {
      setIsLoading(true);
      const fetchedDisputes = await getDisputes();
      // Sort by created date, newest first
      const sorted = fetchedDisputes.sort((a: Dispute, b: Dispute) => {
        const dateA = new Date(a.createdAt).getTime();
        const dateB = new Date(b.createdAt).getTime();
        return dateB - dateA;
      });
      setDisputes(sorted as Dispute[]);
    } catch (error) {
      console.error("Error loading disputes:", error);
      toast({
        title: "Error",
        description: "Failed to load disputes",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleRefund = async (dispute: Dispute) => {
    if (!signer || !provider) {
      toast({
        title: "Error",
        description: "Wallet not connected",
        variant: "destructive",
      });
      return;
    }

    if (!dispute.taskId) {
      toast({
        title: "Error",
        description: "Task ID not found",
        variant: "destructive",
      });
      return;
    }

    setProcessingDispute(dispute.id);
    try {
      // Get escrow details to verify it's locked
      const escrowDetails = await getEscrowDetails(provider, dispute.taskId);
      
      if (escrowDetails.status !== EscrowStatus.Locked) {
        toast({
          title: "Error",
          description: "Escrow is not in locked state",
          variant: "destructive",
        });
        return;
      }

      // Retrieve escrow (refund to creator)
      const tx = await retrieveEscrow(signer, dispute.taskId, "Dispute resolved: Refund to task creator");
      toast({
        title: "Transaction submitted",
        description: "Waiting for confirmation...",
      });

      const receipt = await tx.wait();
      
      // Verify transaction was successful
      if (!receipt || receipt.status !== 1) {
        throw new Error("Transaction failed");
      }

      // Sync with on-chain state - verify escrow status
      const updatedEscrowDetails = await getEscrowDetails(provider, dispute.taskId);
      
      // Update dispute status
      await updateDispute(dispute.id, {
        status: "refunded",
        resolution: {
          decision: "refund",
          resolvedBy: account?.toLowerCase() || "",
          resolvedAt: new Date().toISOString(),
          reason: "Refunded to task creator",
        },
      });

      toast({
        title: "Success",
        description: "Funds have been refunded to the task creator",
      });

      loadDisputes();
    } catch (error: any) {
      console.error("Error refunding escrow:", error);
      toast({
        title: "Error",
        description: error?.message || "Failed to refund escrow",
        variant: "destructive",
      });
    } finally {
      setProcessingDispute(null);
    }
  };

  const handleApprove = async (dispute: Dispute) => {
    if (!signer || !provider) {
      toast({
        title: "Error",
        description: "Wallet not connected",
        variant: "destructive",
      });
      return;
    }

    if (!dispute.taskId) {
      toast({
        title: "Error",
        description: "Task ID not found",
        variant: "destructive",
      });
      return;
    }

    setProcessingDispute(dispute.id);
    try {
      // Get escrow details to verify it's locked and get details
      const escrowDetails = await getEscrowDetails(provider, dispute.taskId);
      
      if (escrowDetails.status !== EscrowStatus.Locked) {
        toast({
          title: "Error",
          description: "Escrow is not in locked state",
          variant: "destructive",
        });
        return;
      }

      // Release escrow by admin (for dispute resolution - approve assignee)
      // This uses the admin-only function to release escrow to contributor
      const tx = await releaseEscrowByAdmin(signer, dispute.taskId);
      toast({
        title: "Transaction submitted",
        description: "Waiting for confirmation...",
      });

      const receipt = await tx.wait();
      
      // Verify transaction was successful
      if (!receipt || receipt.status !== 1) {
        throw new Error("Transaction failed");
      }

      // Sync with on-chain state - verify escrow status
      const updatedEscrowDetails = await getEscrowDetails(provider, dispute.taskId);
      
      // Update dispute status
      await updateDispute(dispute.id, {
        status: "approved",
        resolution: {
          decision: "approve",
          resolvedBy: account?.toLowerCase() || "",
          resolvedAt: new Date().toISOString(),
          reason: "Approved: Funds released to contributor by admin",
        },
      });

      toast({
        title: "Success",
        description: "Funds have been released to the contributor",
      });

      loadDisputes();
    } catch (error: any) {
      console.error("Error approving escrow:", error);
      toast({
        title: "Error",
        description: error?.message || "Failed to release escrow",
        variant: "destructive",
      });
    } finally {
      setProcessingDispute(null);
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "pending":
        return <Badge variant="outline" className="bg-yellow-50 text-yellow-700 border-yellow-300 dark:bg-yellow-950 dark:text-yellow-300">Pending</Badge>;
      case "resolved":
        return <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-300 dark:bg-blue-950 dark:text-blue-300">Resolved</Badge>;
      case "refunded":
        return <Badge variant="outline" className="bg-green-50 text-green-700 border-green-300 dark:bg-green-950 dark:text-green-300">Refunded</Badge>;
      case "approved":
        return <Badge variant="outline" className="bg-purple-50 text-purple-700 border-purple-300 dark:bg-purple-950 dark:text-purple-300">Approved</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  const shortenAddress = (address: string) => {
    return `${address.slice(0, 6)}...${address.slice(-4)}`;
  };

  if (!isClient) {
    return null;
  }

  if (!isConnected) {
    return (
      <ProtectedRoute>
        <div className="flex h-screen bg-gradient-to-b from-slate-50 to-slate-100 dark:from-slate-950 dark:to-slate-900 transition-colors">
          <div className="flex-1 overflow-auto">
            <header className="sticky top-0 z-10 border-b border-slate-200 bg-white/80 backdrop-blur-xl dark:border-slate-800 dark:bg-slate-950/80">
              <div className="flex h-16 items-center justify-between px-4 sm:px-6">
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-indigo-500 to-purple-500 shadow-lg">
                    <Shield className="h-5 w-5 text-white" />
                  </div>
                  <div>
                    <h1 className="text-xl font-semibold tracking-tight text-slate-900 dark:text-slate-50">
                      Admin Panel
                    </h1>
                    <p className="text-xs text-slate-600 dark:text-slate-400">
                      Dispute Resolution
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2 sm:gap-4">
                  <ThemeToggle />
                  <WalletConnect />
                </div>
              </div>
            </header>
            <main className="animate-in fade-in duration-500 p-4 sm:p-6">
              <Alert>
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>
                  Please connect your wallet to access the admin panel.
                </AlertDescription>
              </Alert>
            </main>
          </div>
        </div>
      </ProtectedRoute>
    );
  }

  if (!isAdmin) {
    return (
      <ProtectedRoute>
        <div className="flex h-screen bg-gradient-to-b from-slate-50 to-slate-100 dark:from-slate-950 dark:to-slate-900 transition-colors">
          <div className="flex-1 overflow-auto">
            <header className="sticky top-0 z-10 border-b border-slate-200 bg-white/80 backdrop-blur-xl dark:border-slate-800 dark:bg-slate-950/80">
              <div className="flex h-16 items-center justify-between px-4 sm:px-6">
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-red-500 to-orange-500 shadow-lg">
                    <Shield className="h-5 w-5 text-white" />
                  </div>
                  <div>
                    <h1 className="text-xl font-semibold tracking-tight text-slate-900 dark:text-slate-50">
                      Access Denied
                    </h1>
                    <p className="text-xs text-slate-600 dark:text-slate-400">
                      Admin access required
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2 sm:gap-4">
                  <ThemeToggle />
                  <WalletConnect />
                </div>
              </div>
            </header>
            <main className="animate-in fade-in duration-500 p-4 sm:p-6">
              <div className="mx-auto max-w-2xl">
                <Card className="border-red-200 dark:border-red-900">
                  <CardHeader>
                    <CardTitle className="text-red-900 dark:text-red-100">Access Restricted</CardTitle>
                    <CardDescription className="text-red-700 dark:text-red-300">
                      This page is only accessible to administrators.
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <p className="text-sm text-slate-600 dark:text-slate-400 mb-4">
                      Your wallet address does not have admin privileges.
                    </p>
                    <Button
                      onClick={() => router.push("/projects")}
                      variant="outline"
                      className="gap-2"
                    >
                      <ArrowLeft className="h-4 w-4" />
                      Back to Projects
                    </Button>
                  </CardContent>
                </Card>
              </div>
            </main>
          </div>
        </div>
      </ProtectedRoute>
    );
  }

  return (
    <ProtectedRoute>
      <div className="flex h-screen bg-gradient-to-b from-slate-50 to-slate-100 dark:from-slate-950 dark:to-slate-900 transition-colors">
        <div className="flex-1 overflow-auto">
          <header className="sticky top-0 z-10 border-b border-slate-200 bg-white/80 backdrop-blur-xl dark:border-slate-800 dark:bg-slate-950/80">
            <div className="flex h-16 items-center justify-between px-4 sm:px-6">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-indigo-500 to-purple-500 shadow-lg">
                  <Shield className="h-5 w-5 text-white" />
                </div>
                <div>
                  <h1 className="text-xl font-semibold tracking-tight text-slate-900 dark:text-slate-50">
                    Admin Panel
                  </h1>
                  <p className="text-xs text-slate-600 dark:text-slate-400">
                    Dispute Resolution
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2 sm:gap-4">
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={loadDisputes}
                  disabled={isLoading}
                  className="h-10 w-10 rounded-xl"
                >
                  <RefreshCw className={`h-5 w-5 ${isLoading ? "animate-spin" : ""}`} />
                </Button>
                <ThemeToggle />
                <WalletConnect />
              </div>
            </div>
          </header>

          <main className="animate-in fade-in duration-500 p-4 sm:p-6">
            <div className="mx-auto max-w-6xl space-y-6">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-2xl font-bold text-slate-900 dark:text-slate-50">
                    Task Disputes
                  </h2>
                  <p className="text-sm text-slate-600 dark:text-slate-400 mt-1">
                    Review and resolve disputes between task creators and contributors
                  </p>
                </div>
              </div>

              {isLoading ? (
                <div className="flex items-center justify-center py-12">
                  <Loader2 className="h-8 w-8 animate-spin text-indigo-600 dark:text-indigo-400" />
                </div>
              ) : disputes.length === 0 ? (
                <Card>
                  <CardContent className="py-12 text-center">
                    <Shield className="h-12 w-12 mx-auto text-slate-400 mb-4" />
                    <p className="text-slate-600 dark:text-slate-400">
                      No disputes found
                    </p>
                  </CardContent>
                </Card>
              ) : (
                <div className="space-y-4">
                  {disputes.map((dispute) => {
                    const task = tasks[dispute.taskId];
                    const isProcessing = processingDispute === dispute.id;
                    const canResolve = dispute.status === "pending" && !isProcessing;

                    return (
                      <Card key={dispute.id} className="overflow-hidden">
                        <CardHeader>
                          <div className="flex items-start justify-between">
                            <div className="flex-1">
                              <div className="flex items-center gap-3 mb-2">
                                <CardTitle className="text-lg">
                                  {task?.title || dispute.taskTitle || `Task ${dispute.taskId}`}
                                </CardTitle>
                                {getStatusBadge(dispute.status)}
                              </div>
                              <CardDescription className="text-xs mt-1">
                                Dispute ID: {dispute.id.slice(0, 8)}... | Created: {new Date(dispute.createdAt).toLocaleString()}
                              </CardDescription>
                            </div>
                            {task && (
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => router.push(`/projects/${task.projectId}`)}
                                className="gap-2"
                              >
                                <ExternalLink className="h-4 w-4" />
                                View Task
                              </Button>
                            )}
                          </div>
                        </CardHeader>
                        <CardContent className="space-y-6">
                          {/* Task Info */}
                          <div className="grid grid-cols-2 gap-4 text-sm">
                            <div>
                              <p className="text-slate-500 dark:text-slate-400 mb-1">Task Creator</p>
                              <p className="font-mono text-xs">{shortenAddress(dispute.creatorAddress)}</p>
                            </div>
                            <div>
                              <p className="text-slate-500 dark:text-slate-400 mb-1">Contributor</p>
                              <p className="font-mono text-xs">{shortenAddress(dispute.contributorAddress)}</p>
                            </div>
                            {dispute.escrowAmount && (
                              <>
                                <div>
                                  <p className="text-slate-500 dark:text-slate-400 mb-1">Escrow Amount</p>
                                  <p className="font-semibold">{dispute.escrowAmount} {dispute.escrowToken || "USDC"}</p>
                                </div>
                                <div>
                                  <p className="text-slate-500 dark:text-slate-400 mb-1">Token</p>
                                  <p className="font-semibold">{dispute.escrowToken || "USDC"}</p>
                                </div>
                              </>
                            )}
                          </div>

                          <Separator />

                          {/* Creator Evidence */}
                          <div>
                            <div className="flex items-center gap-2 mb-3">
                              <FileText className="h-4 w-4 text-slate-500" />
                              <h4 className="font-semibold text-sm">Task Creator Evidence</h4>
                            </div>
                            {dispute.creatorEvidence ? (
                              <div className="bg-slate-50 dark:bg-slate-900 rounded-lg p-4 space-y-2">
                                <p className="text-sm text-slate-700 dark:text-slate-300 whitespace-pre-wrap">
                                  {dispute.creatorEvidence.description}
                                </p>
                                {dispute.creatorEvidence.attachments && dispute.creatorEvidence.attachments.length > 0 && (
                                  <div className="flex flex-wrap gap-2 mt-3">
                                    {dispute.creatorEvidence.attachments.map((attachment, idx) => (
                                      <a
                                        key={idx}
                                        href={attachment}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="text-xs text-indigo-600 dark:text-indigo-400 hover:underline flex items-center gap-1"
                                      >
                                        <ExternalLink className="h-3 w-3" />
                                        Attachment {idx + 1}
                                      </a>
                                    ))}
                                  </div>
                                )}
                                <p className="text-xs text-slate-500 dark:text-slate-400 mt-2">
                                  Submitted: {new Date(dispute.creatorEvidence.submittedAt).toLocaleString()}
                                </p>
                              </div>
                            ) : (
                              <p className="text-sm text-slate-500 dark:text-slate-400 italic">No evidence submitted</p>
                            )}
                          </div>

                          {/* Contributor Evidence */}
                          <div>
                            <div className="flex items-center gap-2 mb-3">
                              <FileText className="h-4 w-4 text-slate-500" />
                              <h4 className="font-semibold text-sm">Contributor Evidence</h4>
                            </div>
                            {dispute.contributorEvidence ? (
                              <div className="bg-slate-50 dark:bg-slate-900 rounded-lg p-4 space-y-2">
                                <p className="text-sm text-slate-700 dark:text-slate-300 whitespace-pre-wrap">
                                  {dispute.contributorEvidence.description}
                                </p>
                                {dispute.contributorEvidence.attachments && dispute.contributorEvidence.attachments.length > 0 && (
                                  <div className="flex flex-wrap gap-2 mt-3">
                                    {dispute.contributorEvidence.attachments.map((attachment, idx) => (
                                      <a
                                        key={idx}
                                        href={attachment}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="text-xs text-indigo-600 dark:text-indigo-400 hover:underline flex items-center gap-1"
                                      >
                                        <ExternalLink className="h-3 w-3" />
                                        Attachment {idx + 1}
                                      </a>
                                    ))}
                                  </div>
                                )}
                                <p className="text-xs text-slate-500 dark:text-slate-400 mt-2">
                                  Submitted: {new Date(dispute.contributorEvidence.submittedAt).toLocaleString()}
                                </p>
                              </div>
                            ) : (
                              <p className="text-sm text-slate-500 dark:text-slate-400 italic">No evidence submitted</p>
                            )}
                          </div>

                          {/* Resolution Info */}
                          {dispute.resolution && (
                            <>
                              <Separator />
                              <div className="bg-blue-50 dark:bg-blue-950 rounded-lg p-4">
                                <div className="flex items-center gap-2 mb-2">
                                  <CheckCircle className="h-4 w-4 text-blue-600 dark:text-blue-400" />
                                  <h4 className="font-semibold text-sm text-blue-900 dark:text-blue-100">Resolution</h4>
                                </div>
                                <p className="text-sm text-blue-800 dark:text-blue-200 mb-1">
                                  Decision: <span className="font-semibold capitalize">{dispute.resolution.decision}</span>
                                </p>
                                {dispute.resolution.reason && (
                                  <p className="text-sm text-blue-700 dark:text-blue-300 mt-1">
                                    {dispute.resolution.reason}
                                  </p>
                                )}
                                <p className="text-xs text-blue-600 dark:text-blue-400 mt-2">
                                  Resolved: {new Date(dispute.resolution.resolvedAt).toLocaleString()}
                                </p>
                              </div>
                            </>
                          )}

                          {/* Action Buttons */}
                          {canResolve && (
                            <>
                              <Separator />
                              <div className="flex gap-3">
                                <AlertDialog>
                                  <AlertDialogTrigger asChild>
                                    <Button
                                      variant="destructive"
                                      disabled={isProcessing}
                                      className="flex-1 gap-2"
                                    >
                                      {isProcessing ? (
                                        <>
                                          <Loader2 className="h-4 w-4 animate-spin" />
                                          Processing...
                                        </>
                                      ) : (
                                        <>
                                          <XCircle className="h-4 w-4" />
                                          Refund to Creator
                                        </>
                                      )}
                                    </Button>
                                  </AlertDialogTrigger>
                                  <AlertDialogContent>
                                    <AlertDialogHeader>
                                      <AlertDialogTitle>Refund to Task Creator?</AlertDialogTitle>
                                      <AlertDialogDescription>
                                        This will refund the escrow funds back to the task creator. This action cannot be undone.
                                      </AlertDialogDescription>
                                    </AlertDialogHeader>
                                    <AlertDialogFooter>
                                      <AlertDialogCancel>Cancel</AlertDialogCancel>
                                      <AlertDialogAction onClick={() => handleRefund(dispute)}>
                                        Confirm Refund
                                      </AlertDialogAction>
                                    </AlertDialogFooter>
                                  </AlertDialogContent>
                                </AlertDialog>

                                <AlertDialog>
                                  <AlertDialogTrigger asChild>
                                    <Button
                                      variant="default"
                                      disabled={isProcessing}
                                      className="flex-1 gap-2 bg-gradient-to-r from-indigo-500 to-purple-500 hover:from-indigo-600 hover:to-purple-600"
                                    >
                                      {isProcessing ? (
                                        <>
                                          <Loader2 className="h-4 w-4 animate-spin" />
                                          Processing...
                                        </>
                                      ) : (
                                        <>
                                          <CheckCircle className="h-4 w-4" />
                                          Approve & Release
                                        </>
                                      )}
                                    </Button>
                                  </AlertDialogTrigger>
                                  <AlertDialogContent>
                                    <AlertDialogHeader>
                                      <AlertDialogTitle>Approve & Release Funds?</AlertDialogTitle>
                                      <AlertDialogDescription>
                                        This will release the escrow funds to the contributor. This action cannot be undone.
                                      </AlertDialogDescription>
                                    </AlertDialogHeader>
                                    <AlertDialogFooter>
                                      <AlertDialogCancel>Cancel</AlertDialogCancel>
                                      <AlertDialogAction onClick={() => handleApprove(dispute)}>
                                        Confirm Release
                                      </AlertDialogAction>
                                    </AlertDialogFooter>
                                  </AlertDialogContent>
                                </AlertDialog>
                              </div>
                            </>
                          )}
                        </CardContent>
                      </Card>
                    );
                  })}
                </div>
              )}
            </div>
          </main>
        </div>
      </div>
    </ProtectedRoute>
  );
}

