"use client";

import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { HelpCircle, Tag } from "lucide-react";

interface StatusSelectProps {
  value: string;
  onValueChange: (value: string) => void;
}

export function StatusSelect({ value, onValueChange }: StatusSelectProps) {
  return (
    <div className="space-y-2">
      <Label className="text-xs font-semibold uppercase text-muted-foreground">
        STATUS
      </Label>
      <Select value={value} onValueChange={onValueChange}>
        <SelectTrigger>
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="todo">To Do</SelectItem>
          <SelectItem value="inprogress">In Progress</SelectItem>
          <SelectItem value="review">In Review</SelectItem>
          <SelectItem value="done">Done</SelectItem>
        </SelectContent>
      </Select>
    </div>
  );
}

interface PrioritySelectProps {
  value: string;
  onValueChange: (value: string) => void;
}

export function PrioritySelect({ value, onValueChange }: PrioritySelectProps) {
  return (
    <div className="space-y-2">
      <Label className="text-xs font-semibold uppercase text-muted-foreground">
        PRIORITY
      </Label>
      <Select value={value} onValueChange={onValueChange}>
        <SelectTrigger>
          <SelectValue placeholder="Select a priority" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="low">Low</SelectItem>
          <SelectItem value="medium">Medium</SelectItem>
          <SelectItem value="high">High</SelectItem>
        </SelectContent>
      </Select>
    </div>
  );
}

interface RewardInputProps {
  reward?: string;
  rewardAmount?: number;
  onRewardChange: (reward: string | undefined) => void;
  onAmountChange: (amount: number | undefined) => void;
  label?: string;
}

export function RewardInput({
  reward,
  rewardAmount,
  onRewardChange,
  onAmountChange,
  label = "BOUNTY",
}: RewardInputProps) {
  return (
    <div className="space-y-2">
      <Label className="text-xs font-semibold uppercase text-muted-foreground">
        {label}
      </Label>
      <div className="grid grid-cols-2 gap-2">
        <Select
          value={reward || "no_reward"}
          onValueChange={(value) =>
            onRewardChange(value === "no_reward" ? undefined : value)
          }
        >
          <SelectTrigger>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="USDC">USDC</SelectItem>
            <SelectItem value="USDT">USDT</SelectItem>
          </SelectContent>
        </Select>
        <Input
          type="number"
          value={rewardAmount || ""}
          onChange={(e) =>
            onAmountChange(
              e.target.value ? Number.parseFloat(e.target.value) : undefined
            )
          }
          placeholder="Amount"
        />
      </div>
    </div>
  );
}

export function TaskPointsInput() {
  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <Label className="text-xs font-semibold uppercase text-muted-foreground">
          TASK POINTS
        </Label>
        <HelpCircle className="h-4 w-4 text-muted-foreground" />
      </div>
      <Input placeholder="Estimate task effort" type="number" className="w-full" />
    </div>
  );
}

export function TagsInput() {
  return (
    <div className="space-y-2">
      <Label className="text-xs font-semibold uppercase text-muted-foreground">
        TAGS
      </Label>
      <div className="relative">
        <Tag className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input placeholder="Select tags..." className="pl-9" />
      </div>
    </div>
  );
}