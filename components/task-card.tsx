"use client";

import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { AlertDialog, AlertDialogTrigger, AlertDialogContent, AlertDialogHeader, AlertDialogTitle, AlertDialogDescription, AlertDialogFooter, AlertDialogCancel, AlertDialogAction } from "@/components/ui/alert-dialog";
import { CheckSquare, Square, User } from "lucide-react";
import { useState } from "react";
import type { Task } from "@/lib/types";
import type { DraggableProvided, DraggableStateSnapshot } from "@hello-pangea/dnd";
import { DisputeModal } from "./dispute-modal";

interface TaskCardProps {
  task: Task;
  isSelectionMode?: boolean;
  isSelected?: boolean;
  selectedCount?: number;
  currentUserId: string | null | undefined;
  account: string | null | undefined;
  onClick: (e: React.MouseEvent) => void;
  isDragging?: boolean;
  provided?: DraggableProvided;
  snapshot?: DraggableStateSnapshot;
}

export function TaskCard({
  task,
  isSelectionMode = false,
  isSelected = false,
  selectedCount = 0,
  currentUserId,
  account,
  onClick,
  isDragging = false,
  provided,
  snapshot,
}: TaskCardProps) {
  const getPriorityBadgeClass = (priority: string) => {
    switch (priority) {
      case "high":
        return "priority-badge-high";
      case "medium":
        return "priority-badge-medium";
      case "low":
        return "priority-badge-low";
      default:
        return "";
    }
  };

  const getTaskCardClass = (priority: string) => {
    switch (priority) {
      case "high":
        return "priority-high";
      case "medium":
        return "priority-medium";
      case "low":
        return "priority-low";
      default:
        return "";
    }
  };

  const [isDisputeModalOpen, setIsDisputeModalOpen] = useState(false);
  const isDisputed = task.escrowStatus === "disputed";
  const canBeSelected = task.reward && task.rewardAmount && !task.paid;

  return (
    <div
      ref={provided?.innerRef}
      {...provided?.draggableProps}
      {...provided?.dragHandleProps}
      className={`task-card ${getTaskCardClass(
        task.priority
      )} bg-white dark:bg-[#2a2a2a] p-2 rounded-lg cursor-pointer hover:bg-gray-50 dark:hover:bg-[#333] shadow-sm border transition-colors duration-200 relative sm:p-3 ${isSelected
        ? "border-purple-500 ring-2 ring-purple-200 dark:ring-purple-800 bg-purple-50 dark:bg-purple-900/20"
        : "border-gray-100 dark:border-gray-700"
        } ${isDragging && isSelected ? "shadow-lg opacity-90" : ""}`}
      onClick={onClick}
    >
      <div className="flex items-start gap-1.5 sm:gap-2">
        {/* Selection Checkbox */}
        {isSelectionMode && (
          <div className="mt-0.5 flex-shrink-0 sm:mt-1">
            {canBeSelected ? (
              isSelected ? (
                <CheckSquare className="h-4 w-4 text-purple-600 sm:h-5 sm:w-5" />
              ) : (
                <Square className="h-4 w-4 text-gray-400 sm:h-5 sm:w-5" />
              )
            ) : (
              <Square className="h-4 w-4 text-gray-300 opacity-50 sm:h-5 sm:w-5" />
            )}
          </div>
        )}

        <div className="flex-1 min-w-0">
          <div className="mb-1.5 text-sm font-medium truncate sm:mb-2 sm:text-base">{task.title}</div>
          <div className="mb-1.5 text-xs text-muted-foreground line-clamp-2 sm:mb-2 sm:text-sm">
            {task.description?.length > 80
              ? `${task.description.substring(0, 80)}...`
              : task.description}
          </div>

          {/* Task Badges */}
          <div className="flex items-center justify-between flex-wrap gap-1">
            <div className={`rounded-full px-1.5 py-0.5 text-[10px] sm:px-2 sm:py-1 sm:text-xs ${getPriorityBadgeClass(task.priority)}`}>
              {task.priority.charAt(0).toUpperCase() + task.priority.slice(1)}
            </div>
            {task.tags && task.tags.length > 0 && task.tags.map((tag) => (
              <Badge key={tag} variant="secondary" className="text-[10px] sm:text-xs px-1.5 py-0.5 h-auto font-normal bg-secondary/50 text-secondary-foreground">
                {tag}
              </Badge>
            ))}
            {task.reward && task.rewardAmount && (
              <div
                className={`rounded-full px-1.5 py-0.5 text-[10px] font-semibold border sm:px-2 sm:py-1 sm:text-xs ${task.paid
                  ? "bg-green-100 dark:bg-green-600/20 text-green-600 dark:text-green-400 border-green-200 dark:border-green-500/50"
                  : "bg-amber-100 dark:bg-amber-600/20 text-amber-600 dark:text-amber-400 border-amber-200 dark:border-amber-500/50"
                  }`}
              >
                {task.rewardAmount} {task.reward}
              </div>
            )}
            {task.isOpenBounty && (
              <Badge
                variant="outline"
                className="text-[10px] bg-amber-50 dark:bg-amber-500/10 text-amber-700 dark:text-amber-300 border-amber-200 dark:border-amber-500/30 sm:text-xs"
              >
                Open
              </Badge>
            )}
            {task.escrowEnabled && (
              <Badge
                variant="outline"
                className="text-[10px] bg-blue-50 dark:bg-blue-500/10 text-blue-700 dark:text-blue-300 border-blue-200 dark:border-blue-500/30 sm:text-xs"
              >
                Escrow
              </Badge>
            )}
            {task.paid && (
              <Badge
                variant="outline"
                className="bg-green-100 dark:bg-green-500/20 text-green-600 dark:text-green-500 border-green-200 dark:border-green-500/50 text-[10px] sm:text-xs"
              >
                Paid
              </Badge>
            )}
          </div>

          {/* Assignee Info */}
          <div className="mt-1.5 flex items-center justify-between sm:mt-2">
            {task.assignee ? (
              <div className="flex items-center gap-1.5 sm:gap-2">
                <Avatar className="h-4 w-4 sm:h-5 sm:w-5">
                  <AvatarImage
                    src={task.assignee.profilePicture || "/placeholder.svg"}
                    alt={task.assignee.username || "Assignee"}
                  />
                  <AvatarFallback className="text-[8px] sm:text-xs">
                    {task.assignee.username?.substring(0, 2).toUpperCase() || "??"}
                  </AvatarFallback>
                </Avatar>
                <span className="text-[10px] text-muted-foreground truncate max-w-[80px] sm:text-xs sm:max-w-[100px]">
                  {task.assignee.username || "Unknown"}
                </span>
              </div>
            ) : task.assigneeId ? (
              <div className="flex items-center gap-1.5 sm:gap-2">
                <Avatar className="h-4 w-4 sm:h-5 sm:w-5">
                  <AvatarFallback className="text-[8px] sm:text-xs">?</AvatarFallback>
                </Avatar>
                <span className="text-[10px] text-muted-foreground sm:text-xs">
                  {task.assigneeId === currentUserId ? "You" : "Assigned"}
                </span>
              </div>
            ) : (
              <div className="flex items-center gap-1.5 sm:gap-2">
                <User className="h-3 w-3 text-muted-foreground sm:h-4 sm:w-4" />
                <span className="text-[10px] text-muted-foreground sm:text-xs">Unassigned</span>
              </div>
            )}

            <div className="flex items-center gap-1">
              {task.userId === account && (
                <Badge
                  variant="outline"
                  className="text-[10px] bg-purple-100 dark:bg-purple-600/10 text-purple-600 dark:text-purple-400 border-purple-200 dark:border-purple-600/20 sm:text-xs"
                >
                  Owner
                </Badge>
              )}
              {task.assigneeId === currentUserId && task.userId !== account && (
                <Badge
                  variant="outline"
                  className="text-[10px] bg-blue-100 dark:bg-blue-600/10 text-blue-600 dark:text-blue-400 border-blue-200 dark:border-blue-600/20 sm:text-xs"
                >
                  Assignee
                </Badge>
              )}
              {/* Dispute Option */}
              {task.escrowStatus === 'locked' && !isDisputed && (
                <Badge
                  variant="outline"
                  className="text-[10px] bg-orange-100 dark:bg-orange-600/10 text-orange-600 dark:text-orange-400 border-orange-200 dark:border-orange-600/20 sm:text-xs cursor-pointer hover:bg-orange-200 dark:hover:bg-orange-600/20"
                  onClick={(e) => { e.stopPropagation(); setIsDisputeModalOpen(true); }}
                >
                  Raise Dispute
                </Badge>
              )}
            </div>
          </div>
        </div>

        {/* Batch count indicator */}
        {isSelectionMode && isSelected && selectedCount > 1 && (
          <div className="absolute top-1.5 right-1.5 bg-purple-600 text-white rounded-full w-5 h-5 flex items-center justify-center text-[10px] font-bold sm:top-2 sm:right-2 sm:w-6 sm:h-6 sm:text-xs">
            {selectedCount}
          </div>
        )}
      </div>

      <DisputeModal
        isOpen={isDisputeModalOpen}
        onClose={() => setIsDisputeModalOpen(false)}
        taskId={task.id}
        taskTitle={task.title}
      />
    </div>
  );
}