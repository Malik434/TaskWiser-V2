
import { useState, useCallback } from "react";
import { Task } from "@/lib/types";
import { Column } from "./use-kanban-data";

type SelectionContext = { columnId: string; scope?: "unpaid" } | null;

type UseTaskSelectionProps = {
    columns: Column[];
    allTasks: Task[]; // Usually easier to search in columns, but good to have if needed
    accountId: string | null;
};

export function useTaskSelection({
    columns,
    accountId,
}: UseTaskSelectionProps) {

    const [selectedTasks, setSelectedTasks] = useState<Set<string>>(new Set());
    const [isSelectionMode, setIsSelectionMode] = useState(false);
    const [selectionContext, setSelectionContext] = useState<SelectionContext>(null);

    const isSelectionActiveFor = useCallback((columnId: string, scope?: "unpaid") =>
        selectionContext?.columnId === columnId && selectionContext?.scope === scope,
        [selectionContext]
    );

    const clearSelection = useCallback(() => {
        setSelectedTasks(new Set());
        setIsSelectionMode(false);
        setSelectionContext(null);
    }, []);

    const toggleColumnSelectionMode = useCallback((columnId: string, scope?: "unpaid") => {
        if (isSelectionActiveFor(columnId, scope)) {
            clearSelection();
            return;
        }

        setSelectedTasks(new Set());
        setSelectionContext({ columnId, scope });
        setIsSelectionMode(true);
    }, [isSelectionActiveFor, clearSelection]);

    const toggleTaskSelection = useCallback((taskId: string, task: Task) => {
        if (!selectionContext) {
            return;
        }

        const matchesColumn =
            selectionContext.columnId === "done"
                ? task.status === "done" &&
                (selectionContext.scope !== "unpaid" || !task.paid)
                : task.status === selectionContext.columnId;

        if (!matchesColumn) {
            return;
        }

        // Only allow selection of tasks with rewards that haven't been paid
        if (!task.reward || !task.rewardAmount || task.paid) {
            return;
        }

        if (!accountId || task.userId !== accountId) {
            // Only owner can batch pay?.
            // Original code implies filtering for task.userId === account.
            // Assuming user can only pay their own tasks in batch?
            // Let's stick to original filtering, we checked task.userId === account in selectAllInColumn as well.
            if (task.userId !== accountId) return;
        }

        setSelectedTasks(prev => {
            const newSelection = new Set(prev);
            if (newSelection.has(taskId)) {
                newSelection.delete(taskId);
            } else {
                newSelection.add(taskId);
            }

            if (newSelection.size === 0) {
                // We need to defer state updates if we want to also call clearSelection() 
                // but we can't easily synchronously switch modes inside this callback if we depend on prev.
                // Better to just set empty set here, or rely on effects.
                // But setIsSelectionMode(false) is needed.
                // Let's just return the new selection and handle mode separately or 
                // do the check outside setter?
                // Since we have access to setter, we can't effectively check size inside.
                // We'll stick to simple update and maybe use an effect or check in render if we want to auto-exit
                // But original code did:
                // if (newSelection.size === 0) clearSelection() else setSelectedTasks(newSelection)
                // We can duplicate logic:
            }
            return newSelection;
        });

        // Actually we can't easily do side effects inside the setter. 
        // Let's just update the state directly.
        const newSelection = new Set(selectedTasks);
        if (newSelection.has(taskId)) {
            newSelection.delete(taskId);
        } else {
            newSelection.add(taskId);
        }

        if (newSelection.size === 0) {
            clearSelection();
        } else {
            setSelectedTasks(newSelection);
        }

    }, [selectionContext, accountId, selectedTasks, clearSelection]);


    const selectAllInColumn = useCallback((columnId: string, scope?: "unpaid") => {
        const column = columns.find((col) => col.id === columnId);
        if (!column) return;

        const targetSelection = isSelectionActiveFor(columnId, scope)
            ? new Set(selectedTasks) // Add to existing? No, original code makes new Set from existing if active.. wait
            // Original code:
            // const targetSelection = isSelectionActiveFor(columnId, scope) ? new Set(selectedTasks) : new Set<string>();
            // This logic implies if we are already selecting in this column, we keep current selection and ADD the rest?
            // Yes mostly likely.
            : new Set<string>();

        column.tasks.forEach((task) => {
            if (
                task.reward &&
                task.rewardAmount &&
                !task.paid &&
                task.userId === accountId &&
                (scope !== "unpaid" || !task.paid)
            ) {
                targetSelection.add(task.id);
            }
        });

        setSelectedTasks(targetSelection);
        setSelectionContext({ columnId, scope });
        setIsSelectionMode(true);
    }, [columns, isSelectionActiveFor, selectedTasks, accountId]);

    const getSelectedTasksDetails = useCallback(() => {
        const flattenedTasks = columns.flatMap((col) => col.tasks);
        // Use Set iteration
        return Array.from(selectedTasks)
            .map((id) => flattenedTasks.find((task) => task.id === id))
            .filter(
                (task): task is Task =>
                    task !== undefined &&
                    task.reward !== undefined &&
                    task.rewardAmount !== undefined &&
                    !task.paid
            );
    }, [columns, selectedTasks]);

    return {
        selectedTasks,
        setSelectedTasks,
        isSelectionMode,
        setIsSelectionMode,
        selectionContext,
        setSelectionContext,
        isSelectionActiveFor,
        toggleColumnSelectionMode,
        toggleTaskSelection,
        selectAllInColumn,
        clearSelection,
        getSelectedTasksDetails
    }
}
