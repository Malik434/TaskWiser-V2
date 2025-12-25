"use client";

import { useState } from "react";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { AlertCircle, Loader2 } from "lucide-react";
import { useFirebase } from "@/components/firebase-provider";
import { useToast } from "@/components/ui/use-toast";
import { ethers } from "ethers";
import { raiseDispute } from "@/lib/escrow-contract";
// Note: You'll need to ensure the ABI is available at this path or update imports

interface DisputeModalProps {
    isOpen: boolean;
    onClose: () => void;
    taskId: string;
    taskTitle: string;
    // contractAddress removed as it's handled by lib
}

export function DisputeModal({ isOpen, onClose, taskId, taskTitle }: DisputeModalProps) {
    const [reason, setReason] = useState("");
    const [isSubmitting, setIsSubmitting] = useState(false);
    const { updateTask } = useFirebase();
    const { toast } = useToast();

    const handleRaiseDispute = async () => {
        if (!reason.trim()) return;

        setIsSubmitting(true);
        try {
            // 1. Interact with Smart Contract via Lib
            if (typeof window.ethereum !== 'undefined') {
                const provider = new ethers.BrowserProvider(window.ethereum);
                const signer = await provider.getSigner();

                const tx = await raiseDispute(signer, taskId);
                await tx.wait(); // Wait for confirmation
            }

            // 2. Update Firestore
            await updateTask(taskId, {
                escrowStatus: "disputed",
                activeDisputeId: `dispute_${Date.now()}`,
                // In a real app, we'd add a sub-collection or array for the full dispute record
            });

            toast({
                title: "Dispute Raised",
                description: "The task has been marked as disputed. Funds are locked.",
                variant: "destructive"
            });

            onClose();
        } catch (error: any) {
            console.error("Dispute Error:", error);
            toast({
                title: "Error",
                description: error.message || "Failed to raise dispute",
                variant: "destructive"
            });
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <Dialog open={isOpen} onOpenChange={onClose}>
            <DialogContent className="sm:max-w-[425px]">
                <DialogHeader>
                    <DialogTitle className="flex items-center gap-2 text-red-600">
                        <AlertCircle className="h-5 w-5" />
                        Raise Dispute
                    </DialogTitle>
                    <DialogDescription>
                        This will lock the escrowed funds for <strong>{taskTitle}</strong> until an admin resolves the issue.
                    </DialogDescription>
                </DialogHeader>
                <div className="grid gap-4 py-4">
                    <div className="space-y-2">
                        <Label htmlFor="reason">Reason for Dispute</Label>
                        <Textarea
                            id="reason"
                            placeholder="Describe the issue with the work or payment..."
                            value={reason}
                            onChange={(e) => setReason(e.target.value)}
                            className="min-h-[100px]"
                        />
                    </div>
                </div>
                <DialogFooter>
                    <Button variant="outline" onClick={onClose} disabled={isSubmitting}>
                        Cancel
                    </Button>
                    <Button
                        variant="destructive"
                        onClick={handleRaiseDispute}
                        disabled={!reason.trim() || isSubmitting}
                    >
                        {isSubmitting ? (
                            <>
                                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                Processing...
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
