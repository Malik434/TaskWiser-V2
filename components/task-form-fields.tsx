"use client";

import * as React from "react";

import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { HelpCircle } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Popover, PopoverTrigger, PopoverContent } from "@/components/ui/popover";
import { Checkbox } from "@/components/ui/checkbox";
import { ScrollArea } from "@/components/ui/scroll-area";

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

interface TagsSelectProps {
  selected: string[];
  onChange: (tags: string[]) => void;
  label?: string;
  placeholder?: string;
  options?: string[]; // optional predefined options (e.g., specialties)
}

export function TagsSelect({
  selected,
  onChange,
  label = "TAGS",
  placeholder = "Select tags...",
  options = [],
}: TagsSelectProps) {
  // Freeform input disabled; only predefined options allowed

  function removeTag(tag: string) {
    onChange(selected.filter((s) => s !== tag));
  }

  function toggleOption(opt: string) {
    const next = new Set<string>(selected);
    if (next.has(opt)) {
      next.delete(opt);
    } else {
      next.add(opt);
    }
    onChange(Array.from(next));
  }

  return (
    <div className="space-y-2">
      <Label className="text-xs font-semibold uppercase text-muted-foreground">
        {label}
      </Label>

      {/* Selected chips */}
      <div className="flex items-center gap-2 flex-wrap">
        {selected.map((tag) => (
          <Badge key={tag} variant="secondary" className="flex items-center gap-1">
            <span>{tag}</span>
            <button
              type="button"
              onClick={() => removeTag(tag)}
              className="ml-1 inline-flex items-center justify-center rounded-full w-4 h-4 text-[10px] bg-muted-foreground/20 hover:bg-muted-foreground/30"
            >
              ×
            </button>
          </Badge>
        ))}
      </div>

      {/* Dropdown multi-select */}
      <Popover>
        <PopoverTrigger asChild>
          <Button variant="outline" size="sm" className="justify-between w-full sm:w-auto">
            {placeholder}
            <span className="ml-2 text-xs text-muted-foreground">{selected.length} selected</span>
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-64 p-2">
          {options && options.length > 0 ? (
            <ScrollArea className="h-48">
              <div className="space-y-2">
                {options.map((opt) => {
                  const checked = selected.includes(opt);
                  return (
                    <label key={opt} className="flex items-center gap-2 text-sm">
                      <Checkbox checked={checked} onCheckedChange={() => toggleOption(opt)} />
                      <span className="truncate">{opt}</span>
                    </label>
                  );
                })}
              </div>
            </ScrollArea>
          ) : (
            <p className="text-xs text-muted-foreground">No tags configured. Ask admin to add options.</p>
          )}
        </PopoverContent>
      </Popover>
    </div>
  );
}