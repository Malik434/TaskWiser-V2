
import { useState } from "react";
import { useFirebase } from "../../components/firebase-provider";
import { useWeb3 } from "../../components/web3-provider";
import { useToast } from "@/components/ui/use-toast";
import { Task } from "@/lib/types";
import { Column } from "./use-kanban-data";
import { useKanbanData } from "./use-kanban-data";

type UseKanbanActionsProps = {
    columns: Column[];
    setColumns: React.Dispatch<React.SetStateAction<Column[]>>;
    allTasks: Task[];
    setAllTasks: React.Dispatch<React.SetStateAction<Task[]>>;
    setCreatedTasks: React.Dispatch<React.SetStateAction<Task[]>>;
    setAssignedTasks: React.Dispatch<React.SetStateAction<Task[]>>;
    selectedTasks: Set<string>;
    isSelectionMode: boolean;
    canDragTasks: boolean;
    accountId: string | null;
    fetchAllTasks: () => void;
    // Callback to open dialogs from the hook
    openBatchPaymentDialog: (tasks: Task[]) => void;
    setEscrowTask: (task: Task | null) => void;
    setEscrowMode: (mode: "lock" | "release") => void;
    setIsEscrowPopupOpen: (isOpen: boolean) => void;
    setTaskToPay: (task: Task | null) => void;
    setIsPaymentPopupOpen: (isOpen: boolean) => void;
};

export function useKanbanActions({
    columns,
    setColumns,
    allTasks,
    setAllTasks,
    setCreatedTasks,
    setAssignedTasks,
    selectedTasks,
    isSelectionMode,
    canDragTasks,
    accountId,
    fetchAllTasks,
    openBatchPaymentDialog,
    setEscrowTask,
    setEscrowMode,
    setIsEscrowPopupOpen,
    setTaskToPay,
    setIsPaymentPopupOpen,
}: UseKanbanActionsProps) {
    const { updateTask, logEvent } = useFirebase();
    const { toast } = useToast();

    const [isBatchConfirmationOpen, setIsBatchConfirmationOpen] = useState(false);
    const [pendingBatchMove, setPendingBatchMove] = useState<{
        taskIds: string[];
        destination: string;
        sourceColumn: string;
    } | null>(null);
    const [isProcessingBatchMove, setIsProcessingBatchMove] = useState(false);

    // Helper function to log events (duplicate from kanban-board, ideally move to shared utility)
    // For now we assume logEvent is available from useFirebase.
    const logEventHelper = async (
        action: any,
        taskId?: string,
        meta?: any,
        description?: string
    ) => {
        if (!accountId || !logEvent) return;
        // Basic impl for now since we don't have full context of logEventHelper from main file
        // Ideally this should be passed in or imported if it's a utility
        // We will use the direct logEvent from firebase hook
        try {
            await logEvent({
                taskId: taskId || undefined,
                actorId: accountId,
                actor: accountId, // Simplified
                action,
                meta,
                description
            });
        } catch (e) { console.error("Log event failed", e) }
    };

    const onDragEnd = async (result: any) => {
        // Prevent dragging if user doesn't have permission
        if (!canDragTasks) {
            toast({
                title: "Permission Denied",
                description: "Contributors cannot move tasks",
                variant: "destructive",
            });
            return;
        }

        const { destination, source, draggableId } = result;

        if (
            !destination ||
            (destination.droppableId === source.droppableId &&
                destination.index === source.index)
        ) {
            return;
        }

        const sourceColumnIndex = columns.findIndex(
            (col) => col.id === source.droppableId
        );
        const destinationColumnIndex = columns.findIndex(
            (col) => col.id === destination.droppableId
        );

        if (sourceColumnIndex === -1 || destinationColumnIndex === -1) {
            return;
        }

        const sourceColumn = columns[sourceColumnIndex];
        const draggedTask = sourceColumn.tasks.find(
            (task) => task.id === draggableId
        );

        if (!draggedTask) {
            return;
        }

        const isMultiDrag =
            isSelectionMode &&
            selectedTasks.size > 1 &&
            selectedTasks.has(draggableId);

        const taskIdsToMove = isMultiDrag
            ? sourceColumn.tasks
                .filter((task) => selectedTasks.has(task.id))
                .map((task) => task.id)
            : [draggableId];

        const tasksBeingMoved = sourceColumn.tasks.filter((task) =>
            taskIdsToMove.includes(task.id)
        );

        if (tasksBeingMoved.length === 0) {
            return;
        }

        // Prevent dragging paid tasks
        const paidTasks = tasksBeingMoved.filter((task) => task.paid);
        if (paidTasks.length > 0) {
            toast({
                title: "Cannot move paid tasks",
                description: "Tasks that have been paid cannot be moved",
                variant: "destructive",
            });
            return;
        }

        const timestamp = new Date().toISOString();
        const newColumns = [...columns];

        // Remove tasks from source column
        const updatedSourceTasks = sourceColumn.tasks.filter(
            (task) => !taskIdsToMove.includes(task.id)
        );
        newColumns[sourceColumnIndex] = {
            ...sourceColumn,
            tasks: updatedSourceTasks,
            count: updatedSourceTasks.length,
        };

        // Prepare tasks with updated status
        const movedTasksWithStatus = tasksBeingMoved.map((task) => ({
            ...task,
            status: destination.droppableId,
            updatedAt: timestamp,
            assignee: task.assignee,
        }));

        // Insert tasks into destination column maintaining their order
        const destinationTasks = [...newColumns[destinationColumnIndex].tasks];
        destinationTasks.splice(destination.index, 0, ...movedTasksWithStatus);

        newColumns[destinationColumnIndex] = {
            ...newColumns[destinationColumnIndex],
            tasks: destinationTasks,
            count: destinationTasks.length,
        };

        setColumns(newColumns);

        // Check if this is a batch move to Done column with multiple payable tasks
        const isBatchMoveToDone =
            isMultiDrag &&
            destination.droppableId === "done" &&
            source.droppableId !== "done";
        const payableTasksInBatch = movedTasksWithStatus.filter(
            (task) =>
                task.reward &&
                task.rewardAmount &&
                !task.paid &&
                task.userId === accountId
        );

        // Show confirmation dialog for batch moves to Done with payable tasks
        if (isBatchMoveToDone && payableTasksInBatch.length > 0) {
            setPendingBatchMove({
                taskIds: taskIdsToMove,
                destination: destination.droppableId,
                sourceColumn: source.droppableId,
            });
            setIsBatchConfirmationOpen(true);
            return;
        }

        // Update task status first
        try {
            await Promise.all(
                tasksBeingMoved.map((task) =>
                    updateTask(task.id, {
                        status: destination.droppableId,
                        updatedAt: timestamp,
                    })
                )
            );

            // Log events for each moved task
            // Simplified log event call
            tasksBeingMoved.forEach(task => {
                logEventHelper(
                    "moved",
                    task.id,
                    {
                        fromColumn: source.droppableId,
                        toColumn: destination.droppableId,
                        isBatchMove: isMultiDrag,
                    },
                    `Task "${task.title}" moved from ${source.droppableId} to ${destination.droppableId}`
                );
            });

            // Update local state
            const updateTaskInList = (list: Task[]) =>
                list.map((task) =>
                    taskIdsToMove.includes(task.id)
                        ? {
                            ...task,
                            status: destination.droppableId,
                            updatedAt: timestamp,
                        }
                        : task
                );

            setAllTasks((prev) => updateTaskInList(prev));
            setCreatedTasks((prev) => updateTaskInList(prev));
            setAssignedTasks((prev) => updateTaskInList(prev));

            // For single task moves to Done, check for escrow release or payment
            const taskMovingToDone = movedTasksWithStatus.find(
                (task) =>
                    destination.droppableId === "done" &&
                    source.droppableId !== "done"
            );

            if (taskMovingToDone) {
                // Check if task has escrow that needs to be released
                if (taskMovingToDone.escrowEnabled && taskMovingToDone.escrowStatus === "locked") {
                    setEscrowTask(taskMovingToDone);
                    setEscrowMode("release");
                    setIsEscrowPopupOpen(true);
                    // Status is already updated, escrow release will mark as paid
                    return;
                }

                // Otherwise, show payment popup if payable (and no escrow)
                if (
                    taskMovingToDone.reward &&
                    taskMovingToDone.rewardAmount &&
                    !taskMovingToDone.paid &&
                    taskMovingToDone.userId === accountId &&
                    !taskMovingToDone.escrowEnabled
                ) {
                    setTaskToPay(taskMovingToDone);
                    setIsPaymentPopupOpen(true);
                }
            }
        } catch (error) {
            console.error("Error updating task:", error);
            toast({
                title: "Error",
                description: "Failed to update task status",
                variant: "destructive",
            });
            await fetchAllTasks();
        }
    };

    const handleBatchConfirmation = async (confirmed: boolean) => {
        if (!confirmed || !pendingBatchMove) {
            setIsBatchConfirmationOpen(false);
            setPendingBatchMove(null);
            setIsProcessingBatchMove(false);
            return;
        }

        setIsProcessingBatchMove(true);
        try {
            // Find the tasks being moved
            const sourceColumn = columns.find(
                (col) => col.id === pendingBatchMove.sourceColumn
            );
            if (!sourceColumn) return;

            const tasksBeingMoved = sourceColumn.tasks.filter((task) =>
                pendingBatchMove.taskIds.includes(task.id)
            );

            // Filter for payable tasks
            const payableTasksInBatch = tasksBeingMoved.filter(
                (task) =>
                    task.reward &&
                    task.rewardAmount &&
                    !task.paid &&
                    task.userId === accountId
            );

            // Execute the batch move
            const sourceColumnIndex = columns.findIndex(
                (col) => col.id === pendingBatchMove.sourceColumn
            );
            const destinationColumnIndex = columns.findIndex(
                (col) => col.id === pendingBatchMove.destination
            );

            if (sourceColumnIndex === -1 || destinationColumnIndex === -1) return;

            const timestamp = new Date().toISOString();
            const newColumns = [...columns];

            // Remove tasks from source column
            const updatedSourceTasks = sourceColumn.tasks.filter(
                (task) => !pendingBatchMove.taskIds.includes(task.id)
            );
            newColumns[sourceColumnIndex] = {
                ...newColumns[sourceColumnIndex],
                tasks: updatedSourceTasks,
                count: updatedSourceTasks.length,
            };

            // Insert tasks into destination column
            const destinationTasks = [...newColumns[destinationColumnIndex].tasks];
            const movedTasksWithStatus = tasksBeingMoved.map((task) => ({
                ...task,
                status: pendingBatchMove.destination,
                updatedAt: timestamp,
            }));

            destinationTasks.splice(
                destinationColumnIndex,
                0,
                ...movedTasksWithStatus
            );
            newColumns[destinationColumnIndex] = {
                ...newColumns[destinationColumnIndex],
                tasks: destinationTasks,
                count: destinationTasks.length,
            };

            setColumns(newColumns);

            // Update tasks in Firebase
            await Promise.all(
                tasksBeingMoved.map((task) =>
                    updateTask(task.id, {
                        status: pendingBatchMove.destination,
                        updatedAt: timestamp,
                    })
                )
            );

            // Update all task lists
            const updateTaskInList = (list: Task[]) =>
                list.map((task) =>
                    pendingBatchMove.taskIds.includes(task.id)
                        ? {
                            ...task,
                            status: pendingBatchMove.destination,
                            updatedAt: timestamp,
                        }
                        : task
                );

            setAllTasks((prev) => updateTaskInList(prev));
            setCreatedTasks((prev) => updateTaskInList(prev));
            setAssignedTasks((prev) => updateTaskInList(prev));

            // Clear pending batch move
            setIsBatchConfirmationOpen(false);
            setPendingBatchMove(null);

            // Trigger batch payment if tasks moved to Done
            if (
                payableTasksInBatch.length > 0 &&
                pendingBatchMove.destination === "done"
            ) {
                openBatchPaymentDialog(payableTasksInBatch);
                toast({
                    title: "Batch Ready for Payment",
                    description: `${payableTasksInBatch.length} task(s) moved to Done and ready for batch payment`,
                });
            } else {
                toast({
                    title: "Batch Moved Successfully",
                    description: `${tasksBeingMoved.length} task(s) moved to ${pendingBatchMove.destination}`,
                });
            }
        } catch (error) {
            console.error("Error processing batch move:", error);
            toast({
                title: "Error",
                description: "Failed to process batch move",
                variant: "destructive",
            });
            setIsBatchConfirmationOpen(false);
            setPendingBatchMove(null);
        } finally {
            setIsProcessingBatchMove(false);
        }
    };

    return {
        onDragEnd,
        handleBatchConfirmation,
        isBatchConfirmationOpen,
        setIsBatchConfirmationOpen,
        pendingBatchMove,
        isProcessingBatchMove
    };
}
