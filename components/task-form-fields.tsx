"use client";

import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { HelpCircle, Tag, X } from "lucide-react";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { SPECIALTY_OPTIONS } from "@/lib/specialties";
import { useMemo } from "react";

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
  options?: string[];
  label?: string;
}

export function TagsSelect({ selected, onChange, options, label = "TAGS" }: TagsSelectProps) {
  const tagOptions = useMemo(() => options && options.length > 0 ? options : SPECIALTY_OPTIONS, [options]);
  const selectedTags = selected ?? [];
  const toggleTag = (tag: string) => {
    if (selectedTags.includes(tag)) {
      onChange(selectedTags.filter((t) => t !== tag));
    } else {
      onChange([...selectedTags, tag]);
    }
  };
  const removeTag = (tag: string) => onChange(selectedTags.filter((t) => t !== tag));

  return (
    <div className="space-y-2">
      <Label className="text-xs font-semibold uppercase text-muted-foreground">
        {label}
      </Label>
      <Popover>
        <PopoverTrigger asChild>
          <Button variant="outline" className="w-full justify-start">
            <Tag className="mr-2 h-4 w-4" />
            {selectedTags.length > 0 ? `${selectedTags.length} selected` : "Select tags"}
          </Button>
        </PopoverTrigger>
        <PopoverContent className="p-0 w-64">
          <Command>
            <CommandInput placeholder="Search tags..." />
            <CommandList>
              <CommandEmpty>No tags found.</CommandEmpty>
              <CommandGroup heading="Tags">
                {tagOptions.map((opt) => (
                  <CommandItem key={opt} onSelect={() => toggleTag(opt)}>
                    <div className={`mr-2 h-4 w-4 border rounded-sm flex items-center justify-center ${selectedTags.includes(opt) ? 'bg-purple-600 text-white border-purple-600' : ''}`}>
                      {selectedTags.includes(opt) ? "✓" : ""}
                    </div>
                    <span>{opt}</span>
                  </CommandItem>
                ))}
              </CommandGroup>
            </CommandList>
          </Command>
        </PopoverContent>
      </Popover>

      {selectedTags.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {selectedTags.map((tag) => (
            <Badge key={tag} variant="secondary" className="flex items-center gap-1">
              {tag}
              <button
                type="button"
                onClick={() => removeTag(tag)}
                className="ml-1 inline-flex items-center justify-center"
                aria-label={`Remove ${tag}`}
              >
                <X className="h-3 w-3" />
              </button>
            </Badge>
          ))}
        </div>
      )}
    </div>
  );
}