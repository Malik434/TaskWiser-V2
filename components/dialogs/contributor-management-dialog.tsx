
import React, { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { Loader2, UserPlus, Check, X, Shield, Search } from "lucide-react";
import { Input } from "@/components/ui/input";
import { UserSearchSelect } from "../user-search-select";
import { UserProfile } from "@/lib/types";
import { format } from "date-fns";

interface JoinRequest {
    id: string;
    userId: string;
    user: UserProfile;
    status: 'pending' | 'approved' | 'rejected';
    requestedAt: any; // Timestamp
}

interface ContributorManagementDialogProps {
    isOpen: boolean;
    onClose: () => void;
    pendingJoinRequests: JoinRequest[];
    isLoadingJoinReqs: boolean;
    respondingRequestId: string | null;
    onRespondToRequest: (requestId: string, accept: boolean) => Promise<void>;
    onInviteUser: (userId: string) => Promise<void>;
    availableUsers: UserProfile[];
    projectId: string;
}

export function ContributorManagementDialog({
    isOpen,
    onClose,
    pendingJoinRequests,
    isLoadingJoinReqs,
    respondingRequestId,
    onRespondToRequest,
    onInviteUser,
    availableUsers,
    projectId
}: ContributorManagementDialogProps) {

    const [inviteUserId, setInviteUserId] = useState<string | null>(null);
    const [isInviting, setIsInviting] = useState(false);

    const handleInvite = async () => {
        if (!inviteUserId) return;
        setIsInviting(true);
        await onInviteUser(inviteUserId);
        setIsInviting(false);
        setInviteUserId(null);
    };

    return (
        <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
            <DialogContent className="sm:max-w-2xl">
                <DialogHeader>
                    <DialogTitle>Manage Contributors</DialogTitle>
                    <DialogDescription>Review join requests and invite new members.</DialogDescription>
                </DialogHeader>

                <div className="space-y-6">
                    {/* Invite Section */}
                    <div className="space-y-3 p-4 bg-slate-50 dark:bg-slate-900/40 rounded-lg border border-slate-100 dark:border-slate-800">
                        <h3 className="text-sm font-semibold flex items-center gap-2">
                            <UserPlus className="h-4 w-4 text-purple-600" />
                            Invite Member
                        </h3>
                        <div className="flex gap-2">
                            <div className="flex-1">
                                <UserSearchSelect
                                    users={availableUsers}
                                    value={inviteUserId || ""}
                                    onChange={(id) => setInviteUserId(id || null)}
                                    placeholder="Search user to invite..."
                                />
                            </div>
                            <Button onClick={handleInvite} disabled={!inviteUserId || isInviting}>
                                {isInviting ? <Loader2 className="h-4 w-4 animate-spin" /> : "Invite"}
                            </Button>
                        </div>
                    </div>

                    {/* Pending Requests */}
                    <div className="space-y-3">
                        <h3 className="text-sm font-semibold flex items-center gap-2">
                            <Shield className="h-4 w-4 text-amber-600" />
                            Pending Join Requests ({pendingJoinRequests.length})
                        </h3>
                        <div className="border border-slate-200 dark:border-slate-800 rounded-lg min-h-[150px] overflow-hidden">
                            {isLoadingJoinReqs ? (
                                <div className="flex justify-center items-center h-40">
                                    <Loader2 className="h-6 w-6 animate-spin text-slate-400" />
                                </div>
                            ) : pendingJoinRequests.length === 0 ? (
                                <div className="flex flex-col justify-center items-center h-40 text-slate-500 text-sm">
                                    <p>No pending requests.</p>
                                </div>
                            ) : (
                                <ScrollArea className="h-64">
                                    <div className="divide-y divide-slate-100 dark:divide-slate-800">
                                        {pendingJoinRequests.map(req => (
                                            <div key={req.id} className="p-4 flex items-center justify-between hover:bg-slate-50 dark:hover:bg-slate-900/20 transition-colors">
                                                <div className="flex items-center gap-3">
                                                    <Avatar>
                                                        <AvatarImage src={req.user.profilePicture} />
                                                        <AvatarFallback>{req.user.username.substring(0, 2).toUpperCase()}</AvatarFallback>
                                                    </Avatar>
                                                    <div>
                                                        <p className="font-medium text-sm">{req.user.username}</p>
                                                        <p className="text-xs text-slate-500">Requested {format(req.requestedAt?.toDate ? req.requestedAt.toDate() : new Date(), 'MMM d, yyyy')}</p>
                                                    </div>
                                                </div>
                                                <div className="flex gap-2">
                                                    <Button size="sm" variant="outline"
                                                        className="border-red-200 text-red-600 hover:bg-red-50 hover:text-red-700"
                                                        disabled={respondingRequestId === req.id}
                                                        onClick={() => onRespondToRequest(req.id, false)}
                                                    >
                                                        {respondingRequestId === req.id ? <Loader2 className="h-3 w-3 animate-spin" /> : <X className="h-4 w-4" />}
                                                        <span className="sr-only">Reject</span>
                                                    </Button>
                                                    <Button size="sm"
                                                        className="bg-green-600 hover:bg-green-700 text-white"
                                                        disabled={respondingRequestId === req.id}
                                                        onClick={() => onRespondToRequest(req.id, true)}
                                                    >
                                                        {respondingRequestId === req.id ? <Loader2 className="h-3 w-3 animate-spin" /> : <Check className="h-4 w-4" />}
                                                        <span className="sr-only">Approve</span>
                                                    </Button>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </ScrollArea>
                            )}
                        </div>
                    </div>
                </div>

                <DialogFooter>
                    <Button variant="outline" onClick={onClose}>Close</Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
