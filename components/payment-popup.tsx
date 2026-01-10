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
import { AlertCircle, Loader2, DollarSign } from "lucide-react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import type { Task } from "@/lib/types";
import { PaymentComponent, type SupportedToken } from "./payment-component";
import { useFirebase } from "./firebase-provider";
import { ethers } from "ethers";

interface PaymentPopupProps {
  isOpen: boolean;
  onClose: () => void;
  task: Task | null;
  onPaymentComplete: (taskId: string) => Promise<void>;
}

export function PaymentPopup({
  isOpen,
  onClose,
  task,
  onPaymentComplete,
}: PaymentPopupProps) {
  const { getUserProfileById } = useFirebase();
  const [assigneeAddress, setAssigneeAddress] = useState<string | null>(null);
  const [isResolvingAssignee, setIsResolvingAssignee] = useState(false);
  const [lookupError, setLookupError] = useState<string | null>(null);

  const tokenSymbol = useMemo<SupportedToken | null>(() => {
    if (!task?.reward) return null;
    const reward = task.reward.toUpperCase();
    return reward === "USDC" || reward === "USDT" ? (reward as SupportedToken) : null;
  }, [task]);

  useEffect(() => {
    let cancelled = false;

    const resolveAssigneeAddress = async () => {
      setAssigneeAddress(null);
      setLookupError(null);

      if (!task) return;

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
        console.error("Failed to resolve assignee wallet:", error);
        if (!cancelled) {
          setLookupError("Unable to load the assignee's wallet address.");
        }
      } finally {
        if (!cancelled) {
          setIsResolvingAssignee(false);
        }
      }
    };

    resolveAssigneeAddress();

    return () => {
      cancelled = true;
    };
  }, [task, getUserProfileById]);

  const handleDialogClose = (open: boolean) => {
    if (!open) {
      setAssigneeAddress(null);
      setLookupError(null);
      onClose();
    }
  };

  const canRenderPayment =
    !!task &&
    !!assigneeAddress &&
    typeof task.rewardAmount === "number" &&
    task.rewardAmount > 0 &&
    !!tokenSymbol;

  return (
    <Dialog open={isOpen} onOpenChange={handleDialogClose}>
      <DialogContent className="max-h-[90vh] w-[95vw] overflow-y-auto sm:w-full sm:max-w-xl md:max-w-2xl lg:max-w-3xl">
        <DialogHeader>
          <DialogTitle className="text-lg sm:text-xl">Process Payment</DialogTitle>
          <DialogDescription className="text-sm">
            Send on-chain rewards to the assigned contributor via MetaMask.
          </DialogDescription>
        </DialogHeader>

        {!task ? (
          <Alert variant="destructive" className="p-3 sm:p-4">
            <AlertCircle className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
            <AlertTitle className="text-sm sm:text-base">No task selected</AlertTitle>
            <AlertDescription className="text-xs sm:text-sm">
              Select a task with a reward to initialize the payment flow.
            </AlertDescription>
          </Alert>
        ) : (
          <div className="space-y-3 sm:space-y-4">
            <div className="rounded-lg border bg-gray-50/60 p-3 dark:border-gray-800 dark:bg-gray-900 sm:p-4">
              <div className="flex flex-col gap-2 sm:gap-3">
                <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                  <h3 className="text-sm font-semibold sm:text-base lg:text-lg">{task.title}</h3>
                  <Badge variant="outline" className="w-fit capitalize">
                    {task.status}
                  </Badge>
                </div>
                <p className="text-xs text-muted-foreground sm:text-sm">
                  {task.description?.length && task.description.length > 100
                    ? `${task.description.slice(0, 100)}…`
                    : task.description || "No description provided."}
                </p>
                <div className="flex flex-col gap-2 text-xs sm:flex-row sm:flex-wrap sm:items-center sm:gap-3 sm:text-sm">
                  <div className="flex items-center gap-1 font-medium">
                    <DollarSign className="h-3.5 w-3.5 text-purple-500 sm:h-4 sm:w-4" />
                    {task.rewardAmount} {task.reward}
                  </div>
                  <div className="text-muted-foreground">
                    Assignee: {task.assignee?.username || "Unknown"}
                  </div>
                </div>
              </div>
            </div>

            {lookupError && (
              <Alert variant="destructive" className="p-3 sm:p-4">
                <AlertCircle className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
                <AlertTitle className="text-sm sm:text-base">Wallet required</AlertTitle>
                <AlertDescription className="text-xs sm:text-sm">{lookupError}</AlertDescription>
              </Alert>
            )}

            {isResolvingAssignee && !assigneeAddress && (
              <div className="flex items-center gap-2 text-xs text-muted-foreground sm:text-sm">
                <Loader2 className="h-3.5 w-3.5 animate-spin sm:h-4 sm:w-4" />
                Fetching assignee wallet…
              </div>
            )}

            {canRenderPayment && (
              <PaymentComponent
                key={`${task.id}-${task.reward}-${task.rewardAmount}`}
                mode="single"
                assignee={{
                  address: assigneeAddress!,
                  amount: task.rewardAmount!,
                }}
                defaultToken={tokenSymbol ?? undefined}
                tokenOptions={tokenSymbol ? [tokenSymbol] : undefined}
                onSuccess={async () => {
                  await onPaymentComplete(task.id);
                }}
                onError={(error) => {
                  console.error("Single payout failed:", error);
                }}
              />
            )}

            {!canRenderPayment && !lookupError && (
              <Alert className="p-3 sm:p-4">
                <AlertCircle className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
                <AlertTitle className="text-sm sm:text-base">Cannot start payment</AlertTitle>
                <AlertDescription className="text-xs sm:text-sm">
                  Ensure the task has a valid reward amount, supported token (USDC/USDT), and an assigned contributor.
                </AlertDescription>
              </Alert>
            )}
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
