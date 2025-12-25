import { Task } from "@/lib/types";

export const calculateTotalPayment = (tasks: Task[]) => {
    const totals: Record<string, number> = {};
    tasks.forEach((task) => {
        if (task.reward && task.rewardAmount) {
            if (!totals[task.reward]) {
                totals[task.reward] = 0;
            }
            totals[task.reward] += task.rewardAmount;
        }
    });
    return totals;
};
