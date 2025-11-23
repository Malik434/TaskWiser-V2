"use client";

import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { CheckSquare, Square, User } from "lucide-react";
import type { Task } from "@/lib/types";
import type { DraggableProvided, DraggableStateSnapshot } from "@hello-pangea/dnd";

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

  const canBeSelected = task.reward && task.rewardAmount && !task.paid;

  return (
    <div
      ref={provided?.innerRef}
      {...provided?.draggableProps}
      {...provided?.dragHandleProps}
      className={`task-card ${getTaskCardClass(
        task.priority
      )} bg-white dark:bg-[#2a2a2a] p-3 rounded-lg cursor-pointer hover:bg-gray-50 dark:hover:bg-[#333] shadow-sm border transition-all relative ${
        isSelected
          ? "border-purple-500 ring-2 ring-purple-200 dark:ring-purple-800 bg-purple-50 dark:bg-purple-900/20"
          : "border-gray-100 dark:border-gray-700"
      } ${isDragging && isSelected ? "shadow-lg opacity-90" : ""}`}
      onClick={onClick}
    >
      <div className="flex items-start gap-2">
        {/* Selection Checkbox */}
        {isSelectionMode && (
          <div className="mt-1 flex-shrink-0">
            {canBeSelected ? (
              isSelected ? (
                <CheckSquare className="h-5 w-5 text-purple-600" />
              ) : (
                <Square className="h-5 w-5 text-gray-400" />
              )
            ) : (
              <Square className="h-5 w-5 text-gray-300 opacity-50" />
            )}
          </div>
        )}

        <div className="flex-1 min-w-0">
          <div className="mb-2 font-medium truncate">{task.title}</div>
          <div className="mb-2 text-sm text-muted-foreground line-clamp-2">
            {task.description?.length > 100
              ? `${task.description.substring(0, 100)}...`
              : task.description}
          </div>

          {task.tags && task.tags.length > 0 && (
            <div className="mb-2 flex flex-wrap gap-1">
              {task.tags.map((t) => (
                <Badge
                  key={t}
                  variant="outline"
                  className="text-[10px] px-2 py-0.5 bg-gray-50 dark:bg-gray-800 text-muted-foreground border-gray-200 dark:border-gray-700"
                >
                  {t}
                </Badge>
              ))}
            </div>
          )}

          {/* Task Badges */}
          <div className="flex items-center justify-between flex-wrap gap-1">
            <div className={`rounded-full px-2 py-1 text-xs ${getPriorityBadgeClass(task.priority)}`}>
              {task.priority.charAt(0).toUpperCase() + task.priority.slice(1)}
            </div>
            {task.reward && task.rewardAmount && (
              <div
                className={`rounded-full px-2 py-1 text-xs font-semibold border ${
                  task.paid
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
                className="text-xs bg-amber-50 dark:bg-amber-500/10 text-amber-700 dark:text-amber-300 border-amber-200 dark:border-amber-500/30"
              >
                Open
              </Badge>
            )}
            {task.escrowEnabled && (
              <Badge
                variant="outline"
                className="text-xs bg-blue-50 dark:bg-blue-500/10 text-blue-700 dark:text-blue-300 border-blue-200 dark:border-blue-500/30"
              >
                Escrow
              </Badge>
            )}
            {task.paid && (
              <Badge
                variant="outline"
                className="bg-green-100 dark:bg-green-500/20 text-green-600 dark:text-green-500 border-green-200 dark:border-green-500/50"
              >
                Paid
              </Badge>
            )}
          </div>

          {/* Assignee Info */}
          <div className="mt-2 flex items-center justify-between">
            {task.assignee ? (
              <div className="flex items-center gap-2">
                <Avatar className="h-5 w-5">
                  <AvatarImage
                    src={task.assignee.profilePicture || "/placeholder.svg"}
                    alt={task.assignee.username || "Assignee"}
                  />
                  <AvatarFallback>
                    {task.assignee.username?.substring(0, 2).toUpperCase() || "??"}
                  </AvatarFallback>
                </Avatar>
                <span className="text-xs text-muted-foreground truncate max-w-[100px]">
                  {task.assignee.username || "Unknown"}
                </span>
              </div>
            ) : task.assigneeId ? (
              <div className="flex items-center gap-2">
                <Avatar className="h-5 w-5">
                  <AvatarFallback>?</AvatarFallback>
                </Avatar>
                <span className="text-xs text-muted-foreground">
                  {task.assigneeId === currentUserId ? "You" : "Assigned"}
                </span>
              </div>
            ) : (
              <div className="flex items-center gap-2">
                <User className="h-4 w-4 text-muted-foreground" />
                <span className="text-xs text-muted-foreground">Unassigned</span>
              </div>
            )}

            <div className="flex items-center gap-1">
              {task.userId === account && (
                <Badge
                  variant="outline"
                  className="text-xs bg-purple-100 dark:bg-purple-600/10 text-purple-600 dark:text-purple-400 border-purple-200 dark:border-purple-600/20"
                >
                  Owner
                </Badge>
              )}
              {task.assigneeId === currentUserId && task.userId !== account && (
                <Badge
                  variant="outline"
                  className="text-xs bg-blue-100 dark:bg-blue-600/10 text-blue-600 dark:text-blue-400 border-blue-200 dark:border-blue-600/20"
                >
                  Assignee
                </Badge>
              )}
            </div>
          </div>
        </div>

        {/* Batch count indicator */}
        {isSelectionMode && isSelected && selectedCount > 1 && (
          <div className="absolute top-2 right-2 bg-purple-600 text-white rounded-full w-6 h-6 flex items-center justify-center text-xs font-bold">
            {selectedCount}
          </div>
        )}
      </div>
    </div>
  );
}

