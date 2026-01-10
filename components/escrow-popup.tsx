"use client";

import { useEffect, useMemo, useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { AlertCircle, Loader2, Lock, Shield } from "lucide-react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import type { Task } from "@/lib/types";
import { useWeb3 } from "./web3-provider";
import { useFirebase } from "./firebase-provider";
import { lockEscrow, releaseEscrow, type EscrowStatus } from "@/lib/escrow-contract";
import { ethers } from "ethers";
import { useToast } from "@/hooks/use-toast";

interface EscrowPopupProps {
  isOpen: boolean;
  onClose: () => void;
  task: Task | null;
  mode: "lock" | "release";
  onSuccess: () => Promise<void>;
}

export function EscrowPopup({
  isOpen,
  onClose,
  task,
  mode,
  onSuccess,
}: EscrowPopupProps) {
  const { signer, account } = useWeb3();
  const { getUserProfileById } = useFirebase();
  const { toast } = useToast();
  const [assigneeAddress, setAssigneeAddress] = useState<string | null>(null);
  const [isResolvingAssignee, setIsResolvingAssignee] = useState(false);
  const [lookupError, setLookupError] = useState<string | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [transactionHash, setTransactionHash] = useState<string | null>(null);

  const tokenSymbol = useMemo<"USDC" | "USDT" | null>(() => {
    if (!task?.reward) return null;
    const reward = task.reward.toUpperCase();
    return reward === "USDC" || reward === "USDT" ? (reward as "USDC" | "USDT") : null;
  }, [task]);

  useEffect(() => {
    let cancelled = false;

    const resolveAssigneeAddress = async () => {
      setAssigneeAddress(null);
      setLookupError(null);

      if (!task || mode !== "lock") return;

      const candidateId = task.assigneeId || task.assignee?.id;
      if (!candidateId) {
        setLookupError("This task does not have an assignee yet.");
        return;
      }

      if (ethers.isAddress(candidateId)) {
        setAssigneeAddress(candidateId);
        return;
      }

      setIsResolvingAssignee(true);
      try {
        const profile = await getUserProfileById(candidateId);
        if (!cancelled) {
          if (profile?.address) {
            setAssigneeAddress(profile.address);
          } else {
            setLookupError("No wallet address found for the assignee.");
          }
        }
      } catch (error) {
        if (!cancelled) {
          console.error("Error resolving assignee address:", error);
          setLookupError("Failed to resolve assignee address.");
        }
      } finally {
        if (!cancelled) {
          setIsResolvingAssignee(false);
        }
      }
    };

    if (isOpen && mode === "lock") {
      resolveAssigneeAddress();
    }

    return () => {
      cancelled = true;
    };
  }, [isOpen, task, mode, getUserProfileById]);

  const canProcessEscrow = useMemo(() => {
    if (mode === "lock") {
      return (
        signer &&
        account &&
        task &&
        task.escrowEnabled &&
        tokenSymbol &&
        task.rewardAmount &&
        task.rewardAmount > 0 &&
        assigneeAddress &&
        !lookupError &&
        !isResolvingAssignee
      );
    } else {
      // release mode
      return signer && account && task && task.escrowEnabled && task.escrowStatus === "locked";
    }
  }, [signer, account, task, tokenSymbol, assigneeAddress, lookupError, isResolvingAssignee, mode]);

  const handleLockEscrow = async () => {
    if (!signer || !task || !tokenSymbol || !task.rewardAmount || !assigneeAddress) return;

    setIsProcessing(true);
    setTransactionHash(null);

    try {
      const tx = await lockEscrow(
        signer,
        task.id,
        tokenSymbol,
        assigneeAddress,
        task.rewardAmount
      );

      setTransactionHash(tx.hash);
      toast({
        title: "Transaction submitted",
        description: "Waiting for confirmation...",
      });

      // Wait for transaction confirmation
      const receipt = await tx.wait();
      
      if (receipt && receipt.status === 1) {
        toast({
          title: "Escrow locked",
          description: `Tokens locked successfully. Transaction: ${receipt.hash.slice(0, 10)}...`,
        });
        await onSuccess();
        onClose();
      } else {
        throw new Error("Transaction failed");
      }
    } catch (error: any) {
      console.error("Error locking escrow:", error);
      toast({
        title: "Error",
        description: error?.message || "Failed to lock escrow",
        variant: "destructive",
      });
    } finally {
      setIsProcessing(false);
    }
  };

  const handleReleaseEscrow = async () => {
    if (!signer || !task) return;

    setIsProcessing(true);
    setTransactionHash(null);

    try {
      const tx = await releaseEscrow(signer, task.id);

      setTransactionHash(tx.hash);
      toast({
        title: "Transaction submitted",
        description: "Waiting for confirmation...",
      });

      // Wait for transaction confirmation
      const receipt = await tx.wait();
      
      if (receipt && receipt.status === 1) {
        toast({
          title: "Escrow released",
          description: `Tokens released to assignee. Transaction: ${receipt.hash.slice(0, 10)}...`,
        });
        await onSuccess();
        onClose();
      } else {
        throw new Error("Transaction failed");
      }
    } catch (error: any) {
      console.error("Error releasing escrow:", error);
      toast({
        title: "Error",
        description: error?.message || "Failed to release escrow",
        variant: "destructive",
      });
    } finally {
      setIsProcessing(false);
    }
  };

  if (!task) return null;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md rounded-2xl border-slate-200 dark:border-slate-800">
        <DialogHeader className="border-b border-slate-200 dark:border-slate-800 pb-4">
          <DialogTitle className="text-lg font-semibold bg-gradient-to-r from-blue-600 to-cyan-600 dark:from-blue-400 dark:to-cyan-400 bg-clip-text text-transparent flex items-center gap-2">
            <Lock className="h-5 w-5" />
            {mode === "lock" ? "Lock Escrow" : "Release Escrow"}
          </DialogTitle>
          <DialogDescription className="text-sm text-slate-600 dark:text-slate-400">
            {mode === "lock"
              ? "Lock tokens in escrow for this task"
              : "Release locked tokens to the assignee"}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {mode === "lock" ? (
            <>
              {isResolvingAssignee ? (
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Resolving assignee address...
                </div>
              ) : lookupError ? (
                <Alert variant="destructive" className="p-3 sm:p-4">
                  <AlertCircle className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
                  <AlertTitle className="text-sm sm:text-base">Cannot lock escrow</AlertTitle>
                  <AlertDescription className="text-xs sm:text-sm">
                    {lookupError}
                  </AlertDescription>
                </Alert>
              ) : canProcessEscrow ? (
                <div className="space-y-3">
                  <div className="rounded-lg bg-gradient-to-br from-blue-50 to-cyan-50 dark:from-blue-950/20 dark:to-cyan-950/20 p-4 border border-blue-200 dark:border-blue-800">
                    <div className="space-y-2">
                      <div className="flex justify-between items-center">
                        <span className="text-sm font-medium text-slate-700 dark:text-slate-300">Task:</span>
                        <span className="text-sm font-semibold text-slate-900 dark:text-slate-100">{task.title}</span>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="text-sm font-medium text-slate-700 dark:text-slate-300">Amount:</span>
                        <span className="text-sm font-semibold text-slate-900 dark:text-slate-100">
                          {task.rewardAmount} {tokenSymbol}
                        </span>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="text-sm font-medium text-slate-700 dark:text-slate-300">Assignee:</span>
                        <span className="text-sm font-semibold text-slate-900 dark:text-slate-100 truncate ml-2">
                          {assigneeAddress?.slice(0, 6)}...{assigneeAddress?.slice(-4)}
                        </span>
                      </div>
                    </div>
                  </div>

                  <Alert className="p-3 sm:p-4">
                    <Shield className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
                    <AlertTitle className="text-sm sm:text-base">Escrow Protection</AlertTitle>
                    <AlertDescription className="text-xs sm:text-sm">
                      Tokens will be locked in escrow and released to the assignee when the task is completed.
                    </AlertDescription>
                  </Alert>
                </div>
              ) : (
                <Alert className="p-3 sm:p-4">
                  <AlertCircle className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
                  <AlertTitle className="text-sm sm:text-base">Cannot lock escrow</AlertTitle>
                  <AlertDescription className="text-xs sm:text-sm">
                    Ensure the task has a valid reward amount, supported token (USDC/USDT), and an assigned contributor.
                  </AlertDescription>
                </Alert>
              )}
            </>
          ) : (
            // Release mode
            <div className="space-y-3">
              <div className="rounded-lg bg-gradient-to-br from-green-50 to-emerald-50 dark:from-green-950/20 dark:to-emerald-950/20 p-4 border border-green-200 dark:border-green-800">
                <div className="space-y-2">
                  <div className="flex justify-between items-center">
                    <span className="text-sm font-medium text-slate-700 dark:text-slate-300">Task:</span>
                    <span className="text-sm font-semibold text-slate-900 dark:text-slate-100">{task.title}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm font-medium text-slate-700 dark:text-slate-300">Amount:</span>
                    <span className="text-sm font-semibold text-slate-900 dark:text-slate-100">
                      {task.rewardAmount} {tokenSymbol}
                    </span>
                  </div>
                  {task.assignee && (
                    <div className="flex justify-between items-center">
                      <span className="text-sm font-medium text-slate-700 dark:text-slate-300">Assignee:</span>
                      <span className="text-sm font-semibold text-slate-900 dark:text-slate-100">
                        {task.assignee.username}
                      </span>
                    </div>
                  )}
                </div>
              </div>

              <Alert className="p-3 sm:p-4">
                <Shield className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
                <AlertTitle className="text-sm sm:text-base">Release Escrow</AlertTitle>
                <AlertDescription className="text-xs sm:text-sm">
                  This will release the locked tokens to the assignee. This action cannot be undone.
                </AlertDescription>
              </Alert>
            </div>
          )}

          {transactionHash && (
            <Alert className="p-3 sm:p-4">
              <Loader2 className="h-3.5 w-3.5 sm:h-4 sm:w-4 animate-spin" />
              <AlertTitle className="text-sm sm:text-base">Transaction Pending</AlertTitle>
              <AlertDescription className="text-xs sm:text-sm">
                Transaction: {transactionHash.slice(0, 10)}...{transactionHash.slice(-8)}
              </AlertDescription>
            </Alert>
          )}
        </div>

        <DialogFooter className="border-t border-slate-200 dark:border-slate-800 pt-4">
          <Button
            variant="outline"
            onClick={onClose}
            disabled={isProcessing}
            className="rounded-xl border-slate-300 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 transition-all duration-300"
          >
            Cancel
          </Button>
          <Button
            onClick={mode === "lock" ? handleLockEscrow : handleReleaseEscrow}
            disabled={!canProcessEscrow || isProcessing}
            className="rounded-xl bg-gradient-to-r from-blue-600 to-cyan-600 hover:from-blue-700 hover:to-cyan-700 text-white shadow-lg transition-all duration-300 hover:scale-[1.02] disabled:opacity-50 disabled:hover:scale-100"
          >
            {isProcessing ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                {mode === "lock" ? "Locking..." : "Releasing..."}
              </>
            ) : (
              <>
                <Lock className="mr-2 h-4 w-4" />
                {mode === "lock" ? "Lock Escrow" : "Release Escrow"}
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

