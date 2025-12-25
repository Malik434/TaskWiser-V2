import React, { useMemo } from "react";
import { ethers } from "ethers";
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogDescription,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { PaymentComponent, type SupportedToken } from "./payment-component";
import { AlertCircle, CreditCard, CheckCircle, AlertTriangle } from "lucide-react";
import type { Task, UserProfile } from "@/lib/types";
import { calculateTotalPayment } from "@/lib/payment-utils";

interface BatchPaymentPopupProps {
    isOpen: boolean;
    onClose: () => void;
    tasks: Task[];
    availableUsers: UserProfile[]; // Needed to resolve wallet addresses
    canProcessBatchPayment: boolean;
    onPaymentComplete: (taskIds: string[]) => Promise<void>;
}

export function BatchPaymentPopup({
    isOpen,
    onClose,
    tasks: batchPaymentTasks,
    availableUsers,
    canProcessBatchPayment,
    onPaymentComplete,
}: BatchPaymentPopupProps) {

    // Helpers moved from kanban-board.tsx
    const toSupportedToken = (token?: string | null): SupportedToken | null => {
        if (!token) return null;
        const normalized = token.toUpperCase();
        return normalized === "USDC" || normalized === "USDT"
            ? (normalized as SupportedToken)
            : null;
    };

    const resolveAssigneeWallet = (task: Task) => {
        const candidateId = task.assigneeId || task.assignee?.id;
        if (!candidateId) return null;
        const profile =
            availableUsers.find((user) => user.id === candidateId) ||
            availableUsers.find((user) => user.address === candidateId);
        if (profile?.address) {
            return profile.address;
        }
        if (ethers.isAddress(candidateId)) {
            return candidateId;
        }
        return null;
    };

    const batchPaymentMeta = useMemo(() => {
        const recipients = batchPaymentTasks.map((task) => {
            const address = resolveAssigneeWallet(task);
            const token = toSupportedToken(task.reward);
            const amount = task.rewardAmount ?? 0;
            return { task, address, token, amount };
        });

        const missingAddress = recipients.filter((entry) => !entry.address);
        const invalidAmounts = recipients.filter((entry) => entry.amount <= 0);
        const missingToken = recipients.filter((entry) => !entry.token);
        const validRecipients = recipients.filter(
            (entry) => entry.address && entry.token && entry.amount > 0
        );
        const uniqueTokens = Array.from(
            new Set(validRecipients.map((entry) => entry.token as SupportedToken))
        );

        return {
            recipients,
            validRecipients,
            missingAddress,
            invalidAmounts,
            missingToken,
            batchToken: uniqueTokens.length === 1 ? uniqueTokens[0] : null,
            hasMixedTokens: uniqueTokens.length > 1,
        };
    }, [batchPaymentTasks, availableUsers]);

    const canExecuteBatchPayment =
        canProcessBatchPayment &&
        batchPaymentTasks.length > 0 &&
        batchPaymentMeta.validRecipients.length === batchPaymentTasks.length &&
        Boolean(batchPaymentMeta.batchToken);

    const batchBlockingIssues = useMemo(() => {
        const issues: string[] = [];
        if (batchPaymentMeta.missingAddress.length) {
            issues.push(
                `${batchPaymentMeta.missingAddress.length} task(s) are missing assignee wallet addresses.`
            );
        }
        if (batchPaymentMeta.invalidAmounts.length) {
            issues.push(
                `${batchPaymentMeta.invalidAmounts.length} task(s) have invalid reward amounts.`
            );
        }
        if (batchPaymentMeta.missingToken.length) {
            issues.push(
                `${batchPaymentMeta.missingToken.length} task(s) use unsupported reward tokens.`
            );
        }
        if (batchPaymentMeta.hasMixedTokens) {
            issues.push("Selected tasks must all use the same stablecoin (USDC or USDT).");
        }
        return issues;
    }, [batchPaymentMeta]);

    return (
        <Dialog
            open={isOpen}
            onOpenChange={(open) => {
                if (!open) onClose();
            }}
        >
            <DialogContent className="sm:max-w-2xl max-h-[80vh] overflow-y-auto">
                <DialogHeader>
                    <DialogTitle>Batch Payment</DialogTitle>
                    <DialogDescription>
                        Review and process payments for {batchPaymentTasks.length} task
                        {batchPaymentTasks.length === 1 ? "" : "s"}
                    </DialogDescription>
                </DialogHeader>

                {!canProcessBatchPayment && (
                    <div className="flex items-center gap-2 px-3 py-2 bg-red-50 dark:bg-red-900/20 rounded-md border border-red-200 dark:border-red-800">
                        <AlertCircle className="h-4 w-4 text-red-600 dark:text-red-400 flex-shrink-0" />
                        <p className="text-xs text-red-600 dark:text-red-400">
                            Only project admins can process batch payments. Contact your project admin.
                        </p>
                    </div>
                )}

                <div className="space-y-4 py-4">
                    {/* Payment Summary */}
                    <div className="bg-purple-50 dark:bg-purple-900/20 rounded-lg p-4">
                        <h3 className="font-medium mb-3 flex items-center gap-2">
                            <CreditCard className="h-5 w-5" />
                            Payment Summary
                        </h3>
                        <div className="space-y-2">
                            {Object.entries(calculateTotalPayment(batchPaymentTasks)).map(
                                ([token, amount]) => (
                                    <div key={token} className="flex justify-between items-center">
                                        <span className="text-sm font-medium">Total {token}:</span>
                                        <span className="font-bold text-lg">
                                            {amount} {token}
                                        </span>
                                    </div>
                                )
                            )}
                        </div>
                    </div>

                    {/* Task List */}
                    <div>
                        <h3 className="font-medium mb-3">Selected Tasks</h3>
                        <div className="space-y-2 max-h-96 overflow-y-auto">
                            {batchPaymentTasks.map((task) => (
                                <div
                                    key={task.id}
                                    className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-700 rounded-lg"
                                >
                                    <div className="flex-1 min-w-0 mr-4">
                                        <div className="font-medium truncate">{task.title}</div>
                                        <div className="text-sm text-muted-foreground flex items-center gap-2 mt-1">
                                            <Avatar className="h-4 w-4">
                                                <AvatarImage
                                                    src={
                                                        task.assignee?.profilePicture ||
                                                        "/placeholder.svg"
                                                    }
                                                    alt={task.assignee?.username}
                                                />
                                                <AvatarFallback className="text-xs">
                                                    {task.assignee?.username
                                                        ?.substring(0, 2)
                                                        .toUpperCase() || "?"}
                                                </AvatarFallback>
                                            </Avatar>
                                            <span className="truncate">
                                                {task.assignee?.username || "Unknown"}
                                            </span>
                                        </div>
                                    </div>
                                    <div className="text-right flex-shrink-0">
                                        <div className="font-bold">
                                            {task.rewardAmount} {task.reward}
                                        </div>
                                        <Badge variant="outline" className="mt-1 text-xs">
                                            {task.status}
                                        </Badge>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>

                    {/* Warning Message */}
                    <div className="flex items-start gap-2 p-3 bg-amber-50 dark:bg-amber-900/20 rounded-lg border border-amber-200 dark:border-amber-800">
                        <AlertTriangle className="h-5 w-5 text-amber-600 dark:text-amber-500 flex-shrink-0 mt-0.5" />
                        <div className="text-sm text-amber-800 dark:text-amber-200">
                            <p className="font-medium">Please confirm</p>
                            <p className="mt-1">
                                This action will process {batchPaymentTasks.length} payment
                                {batchPaymentTasks.length === 1 ? "" : "s"}. Confirm that you
                                have enough balance and gas on Sepolia.
                            </p>
                        </div>
                    </div>

                    {batchBlockingIssues.length > 0 && (
                        <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700 dark:border-red-900/60 dark:bg-red-900/20 dark:text-red-200">
                            <p className="font-medium">Resolve before paying</p>
                            <ul className="mt-2 list-disc space-y-1 pl-5">
                                {batchBlockingIssues.map((issue) => (
                                    <li key={issue}>{issue}</li>
                                ))}
                            </ul>
                        </div>
                    )}

                    {canExecuteBatchPayment && (
                        <PaymentComponent
                            key={`batch-${batchPaymentTasks.length}-${batchPaymentMeta.batchToken}`}
                            mode="batch"
                            assignees={batchPaymentMeta.validRecipients.map(
                                ({ address, amount }) => ({
                                    address: address as string,
                                    amount,
                                })
                            )}
                            defaultToken={batchPaymentMeta.batchToken ?? undefined}
                            tokenOptions={
                                batchPaymentMeta.batchToken
                                    ? [batchPaymentMeta.batchToken]
                                    : undefined
                            }
                            onSuccess={async () => {
                                const paidTaskIds = batchPaymentMeta.validRecipients.map(
                                    ({ task }) => task.id
                                );
                                await onPaymentComplete(paidTaskIds);
                            }}
                            onError={(error) => {
                                console.error("Batch payout failed:", error);
                            }}
                        />
                    )}
                    {!canExecuteBatchPayment && batchPaymentTasks.length > 0 && (
                        <div className="text-sm text-muted-foreground">
                            Payments will be enabled once all tasks have a wallet, reward,
                            and supported token.
                        </div>
                    )}
                </div>
            </DialogContent>
        </Dialog>
    );
}
