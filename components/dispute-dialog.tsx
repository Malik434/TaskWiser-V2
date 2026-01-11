"use client";

import { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { AlertCircle, Loader2, AlertTriangle } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import type { Task } from "@/lib/types";
import { useWeb3 } from "./web3-provider";
import { useFirebase } from "./firebase-provider";
import { useToast } from "@/components/ui/use-toast";
import { isEscrowLocked } from "@/lib/escrow-contract";

interface DisputeDialogProps {
  isOpen: boolean;
  onClose: () => void;
  task: Task | null;
  onSuccess: () => Promise<void>;
}

export function DisputeDialog({
  isOpen,
  onClose,
  task,
  onSuccess,
}: DisputeDialogProps) {
  const { account, provider } = useWeb3();
  const { createDispute, getUserProfileById, getUserProfile } = useFirebase();
  const { toast } = useToast();
  const [evidence, setEvidence] = useState("");
  const [attachments, setAttachments] = useState<string[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isCheckingEscrow, setIsCheckingEscrow] = useState(false);
  const [escrowLocked, setEscrowLocked] = useState(false);

  // Check escrow status when dialog opens
  useEffect(() => {
    if (isOpen && task && provider) {
      checkEscrowStatus();
    }
  }, [isOpen, task, provider]);

  const checkEscrowStatus = async () => {
    if (!task || !provider) return;
    
    setIsCheckingEscrow(true);
    try {
      const locked = await isEscrowLocked(provider, task.id);
      setEscrowLocked(locked);
    } catch (error) {
      console.error("Error checking escrow status:", error);
      // If check fails, assume not locked to show error
      setEscrowLocked(false);
    } finally {
      setIsCheckingEscrow(false);
    }
  };

  const handleSubmit = async () => {
    if (!task || !account || !evidence.trim()) {
      toast({
        title: "Error",
        description: "Please provide evidence for the dispute",
        variant: "destructive",
      });
      return;
    }

    // Validate escrow is locked
    if (!escrowLocked && task.escrowStatus !== "locked") {
      toast({
        title: "Error",
        description: "Disputes can only be raised for tasks with locked escrow",
        variant: "destructive",
      });
      return;
    }

    setIsSubmitting(true);
    try {
      // Get contributor address
      let contributorAddress = "";
      if (task.assigneeId) {
        if (task.assignee?.id) {
          const profile = await getUserProfileById(task.assignee.id);
          contributorAddress = profile?.address || "";
        } else if (task.assigneeId.includes("0x")) {
          contributorAddress = task.assigneeId;
        } else {
          const profile = await getUserProfileById(task.assigneeId);
          contributorAddress = profile?.address || "";
        }
      }

      if (!contributorAddress) {
        throw new Error("Could not resolve contributor address");
      }

      // Determine who is raising the dispute
      const isCreator = task.userId?.toLowerCase() === account.toLowerCase();
      const isReviewer = task.reviewerId && task.reviewerId === account;
      
      // Create dispute
      const disputeId = await createDispute({
        taskId: task.id,
        taskTitle: task.title,
        creatorAddress: task.userId || "",
        contributorAddress: contributorAddress,
        status: "pending",
        escrowAmount: task.rewardAmount,
        escrowToken: task.reward as "USDC" | "USDT" | undefined,
        ...(isCreator
          ? {
              creatorEvidence: {
                description: evidence.trim(),
                attachments: attachments,
                submittedAt: new Date().toISOString(),
              },
            }
          : {
              contributorEvidence: {
                description: evidence.trim(),
                attachments: attachments,
                submittedAt: new Date().toISOString(),
              },
            }),
      });

      toast({
        title: "Dispute raised",
        description: "Your dispute has been submitted and will be reviewed by an admin",
      });

      // Reset form
      setEvidence("");
      setAttachments([]);
      onClose();
      await onSuccess();
    } catch (error: any) {
      console.error("Error creating dispute:", error);
      toast({
        title: "Error",
        description: error?.message || "Failed to raise dispute",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!task) return null;

  const isCreator = task.userId?.toLowerCase() === account?.toLowerCase();
  const isReviewer = task.reviewerId && task.reviewerId === account;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[600px] rounded-2xl">
        <DialogHeader>
          <DialogTitle className="text-xl font-semibold">
            Raise Dispute
          </DialogTitle>
          <DialogDescription>
            Submit evidence for this task dispute. Only tasks with locked escrow can be disputed.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {/* Task Info */}
          <div className="rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900 p-4">
            <h3 className="text-sm font-semibold mb-2">{task.title}</h3>
            <div className="flex gap-2 text-xs text-slate-600 dark:text-slate-400">
              <span>Task ID: {task.id.slice(0, 8)}...</span>
              {task.rewardAmount && (
                <span>
                  Escrow: {task.rewardAmount} {task.reward}
                </span>
              )}
            </div>
          </div>

          {/* Escrow Status Check */}
          {isCheckingEscrow ? (
            <Alert>
              <Loader2 className="h-4 w-4 animate-spin" />
              <AlertDescription>Checking escrow status...</AlertDescription>
            </Alert>
          ) : !escrowLocked && task.escrowStatus !== "locked" ? (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>
                This task does not have locked escrow. Disputes can only be raised for tasks with escrow enabled and locked.
              </AlertDescription>
            </Alert>
          ) : null}

          {/* Evidence Input */}
          <div className="space-y-2">
            <Label htmlFor="evidence">
              {isCreator
                ? "Your Evidence (as Task Creator)"
                : isReviewer
                ? "Your Evidence (as Reviewer)"
                : "Your Evidence"}
            </Label>
            <Textarea
              id="evidence"
              value={evidence}
              onChange={(e) => setEvidence(e.target.value)}
              placeholder="Describe the issue and provide evidence for this dispute..."
              className="min-h-[150px] rounded-xl"
              disabled={isSubmitting || (!escrowLocked && task.escrowStatus !== "locked")}
            />
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Provide a detailed description of the issue, including any relevant information, links, or screenshots.
            </p>
          </div>

          {/* Warning */}
          <Alert>
            <AlertTriangle className="h-4 w-4" />
            <AlertDescription>
              Disputes will be reviewed by an administrator. Please provide clear evidence to support your case.
            </AlertDescription>
          </Alert>
        </div>

        <DialogFooter>
          <Button
            variant="outline"
            onClick={onClose}
            disabled={isSubmitting}
            className="rounded-xl"
          >
            Cancel
          </Button>
          <Button
            onClick={handleSubmit}
            disabled={
              isSubmitting ||
              !evidence.trim() ||
              (!escrowLocked && task.escrowStatus !== "locked")
            }
            className="rounded-xl bg-gradient-to-r from-red-600 to-orange-600 hover:from-red-700 hover:to-orange-700 text-white"
          >
            {isSubmitting ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Submitting...
              </>
            ) : (
              "Raise Dispute"
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

