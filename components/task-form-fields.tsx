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
    <div className="space-y-2.5">
      <Label className="text-sm font-medium text-slate-700 dark:text-slate-300 sm:text-xs sm:font-semibold sm:uppercase sm:text-muted-foreground">
        Status
      </Label>
      <Select value={value} onValueChange={onValueChange}>
        <SelectTrigger className="h-11 sm:h-10 text-base sm:text-sm">
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
    <div className="space-y-2.5">
      <Label className="text-sm font-medium text-slate-700 dark:text-slate-300 sm:text-xs sm:font-semibold sm:uppercase sm:text-muted-foreground">
        Priority
      </Label>
      <Select value={value} onValueChange={onValueChange}>
        <SelectTrigger className="h-11 sm:h-10 text-base sm:text-sm">
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
  disabled?: boolean;
}

export function RewardInput({
  reward,
  rewardAmount,
  onRewardChange,
  onAmountChange,
  label = "BOUNTY",
  disabled = false,
}: RewardInputProps) {
  const handleAmountChange = (
    event: React.ChangeEvent<HTMLInputElement>
  ) => {
    const rawValue = event.target.value;
    if (!rawValue.trim()) {
      onAmountChange(undefined);
      return;
    }

    const parsed = Number.parseFloat(rawValue);
    if (!Number.isFinite(parsed) || parsed <= 0) {
      onAmountChange(undefined);
      return;
    }

    const normalized = Math.abs(parsed);
    onAmountChange(normalized);
  };

  return (
    <div className="space-y-2.5">
      <Label className="text-sm font-medium text-slate-700 dark:text-slate-300 sm:text-xs sm:font-semibold sm:uppercase sm:text-muted-foreground">
        {label}
      </Label>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-2">
        <Select
          value={reward || "no_reward"}
          onValueChange={(value) =>
            onRewardChange(value === "no_reward" ? undefined : value)
          }
          disabled={disabled}
        >
          <SelectTrigger className="h-11 sm:h-10 text-base sm:text-sm">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="USDC">USDC</SelectItem>
            <SelectItem value="USDT">USDT</SelectItem>
          </SelectContent>
        </Select>
        <Input
          type="number"
          min="0.01"
          step="0.01"
          inputMode="decimal"
          value={rewardAmount ? String(rewardAmount) : ""}
          onChange={handleAmountChange}
          placeholder="Amount"
          disabled={disabled}
          className="h-11 sm:h-10 text-base sm:text-sm"
        />
      </div>
    </div>
  );
}

export function TaskPointsInput() {
  const handleInput = (event: React.ChangeEvent<HTMLInputElement>) => {
    const rawValue = event.target.value;
    if (!rawValue.trim()) {
      event.target.value = "";
      return;
    }

    const parsed = Number.parseFloat(rawValue);
    if (!Number.isFinite(parsed) || parsed <= 0) {
      event.target.value = "";
      return;
    }

    event.target.value = Math.max(0, Math.abs(parsed)).toString();
  };

  return (
    <div className="space-y-2.5">
      <div className="flex items-center justify-between">
        <Label className="text-sm font-medium text-slate-700 dark:text-slate-300 sm:text-xs sm:font-semibold sm:uppercase sm:text-muted-foreground">
          Task Points
        </Label>
        <HelpCircle className="h-4 w-4 text-muted-foreground" />
      </div>
      <Input
        placeholder="Estimate task effort"
        type="number"
        min="1"
        step="1"
        inputMode="numeric"
        pattern="[0-9]*"
        onChange={handleInput}
        className="w-full h-11 sm:h-10 text-base sm:text-sm"
      />
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
    <div className="space-y-2.5">
      <Label className="text-sm font-medium text-slate-700 dark:text-slate-300 sm:text-xs sm:font-semibold sm:uppercase sm:text-muted-foreground">
        {label}
      </Label>

      {/* Selected chips */}
      <div className="flex items-center gap-2 flex-wrap">
        {selected.map((tag) => (
          <Badge key={tag} variant="secondary" className="flex items-center gap-1.5 py-1.5 px-2.5 text-sm">
            <span>{tag}</span>
            <button
              type="button"
              onClick={() => removeTag(tag)}
              className="inline-flex items-center justify-center rounded-full w-5 h-5 text-xs bg-muted-foreground/20 hover:bg-muted-foreground/30 transition-colors"
              aria-label={`Remove ${tag}`}
            >
              ×
            </button>
          </Badge>
        ))}
      </div>

      {/* Dropdown multi-select */}
      <Popover>
        <PopoverTrigger asChild>
          <Button variant="outline" size="sm" className="justify-between w-full h-11 sm:h-9 text-base sm:text-sm">
            {placeholder}
            <span className="ml-2 text-sm sm:text-xs text-muted-foreground">{selected.length} selected</span>
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-[calc(100vw-2rem)] sm:w-64 p-3" align="start">
          {options && options.length > 0 ? (
            <ScrollArea className="h-48 sm:h-60">
              <div className="space-y-2.5">
                {options.map((opt) => {
                  const checked = selected.includes(opt);
                  return (
                    <label key={opt} className="flex items-center gap-3 text-sm sm:text-sm cursor-pointer py-1.5 px-1 rounded-md hover:bg-accent transition-colors">
                      <Checkbox checked={checked} onCheckedChange={() => toggleOption(opt)} className="h-5 w-5" />
                      <span className="flex-1">{opt}</span>
                    </label>
                  );
                })}
              </div>
            </ScrollArea>
          ) : (
            <p className="text-sm text-muted-foreground py-2">No tags configured. Ask admin to add options.</p>
          )}
        </PopoverContent>
      </Popover>
    </div>
  );
}