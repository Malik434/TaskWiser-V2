"use client";

import { useState } from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { User, Loader2, XCircle } from "lucide-react";
import type { UserProfile } from "@/lib/types";

interface UserSearchSelectProps {
  label: string;
  placeholder: string;
  selectedUserId?: string;
  availableUsers: UserProfile[];
  isLoadingUsers: boolean;
  onSelectUser: (userId: string | undefined) => void;
  emptyLabel?: string;
  className?: string;
  disabled?: boolean;
}

export function UserSearchSelect({
  label,
  placeholder,
  selectedUserId,
  availableUsers,
  isLoadingUsers,
  onSelectUser,
  emptyLabel = "Unassigned",
  className = "",
  disabled = false,
}: UserSearchSelectProps) {
  const [searchQuery, setSearchQuery] = useState("");

  const getFilteredUsers = (users: UserProfile[], query: string) => {
    if (!query) return users;
    return users.filter(
      (user) =>
        user.username.toLowerCase().includes(query.toLowerCase()) ||
        user.address.toLowerCase().includes(query.toLowerCase())
    );
  };

  const selectedUser = availableUsers.find((user) => user.id === selectedUserId);

  return (
    <div className={`space-y-2.5 ${className}`}>
      <Label className="text-sm font-medium text-slate-700 dark:text-slate-300 sm:text-xs sm:font-semibold sm:uppercase sm:text-muted-foreground">
        {label}
      </Label>
      <div className="relative">
        <Input
          placeholder={placeholder}
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="w-full h-11 sm:h-10 text-base sm:text-sm"
          disabled={disabled}
        />
        <div
          className={`absolute z-50 mt-1 w-full rounded-lg border bg-popover shadow-lg ${
            searchQuery ? "block" : "hidden"
          }`}
        >
          <div className="max-h-60 overflow-auto p-1.5">
            <div
              className="flex items-center gap-2.5 rounded-md px-3 py-2.5 text-sm cursor-pointer hover:bg-accent active:bg-accent transition-colors"
              onClick={() => {
                onSelectUser(undefined);
                setSearchQuery("");
              }}
            >
              <User className="h-4 w-4 flex-shrink-0" />
              <span>{emptyLabel}</span>
            </div>
            {isLoadingUsers ? (
              <div className="flex items-center justify-center p-3">
                <Loader2 className="h-4 w-4 animate-spin" />
              </div>
            ) : (
              getFilteredUsers(availableUsers, searchQuery).map((user) => (
                <div
                  key={user.id}
                  className="flex items-center gap-3 rounded-md px-3 py-2.5 text-sm cursor-pointer hover:bg-accent active:bg-accent transition-colors"
                  onClick={() => {
                    onSelectUser(user.id);
                    setSearchQuery("");
                  }}
                >
                  <Avatar className="h-8 w-8 sm:h-6 sm:w-6 flex-shrink-0">
                    <AvatarImage
                      src={user.profilePicture || "/placeholder.svg"}
                      alt={user.username}
                    />
                    <AvatarFallback>
                      {user.username.substring(0, 2)}
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex flex-col min-w-0 flex-1">
                    <span className="font-medium truncate">{user.username}</span>
                    <span className="text-xs text-muted-foreground truncate">
                      {user.address.substring(0, 10)}...
                    </span>
                  </div>
                </div>
              ))
            )}
            {searchQuery &&
              getFilteredUsers(availableUsers, searchQuery).length === 0 && (
                <div className="px-3 py-2.5 text-sm text-muted-foreground">
                  No users found
                </div>
              )}
          </div>
        </div>
      </div>
      {selectedUser && (
        <div className="flex items-center gap-3 mt-2 p-2.5 rounded-lg bg-slate-50 dark:bg-slate-900/50 border border-slate-200 dark:border-slate-800">
          <Avatar className="h-8 w-8 sm:h-7 sm:w-7 flex-shrink-0">
            <AvatarImage
              src={selectedUser.profilePicture || "/placeholder.svg"}
              alt={selectedUser.username}
            />
            <AvatarFallback>
              {selectedUser.username?.substring(0, 2) || "UN"}
            </AvatarFallback>
          </Avatar>
          <span className="text-sm font-medium flex-1 min-w-0 truncate">{selectedUser.username || "Unknown User"}</span>
          <Button
            variant="ghost"
            size="sm"
            className="h-8 w-8 sm:h-7 sm:w-7 p-0 rounded-full flex-shrink-0"
            onClick={() => onSelectUser(undefined)}
            disabled={disabled}
          >
            <XCircle className="h-4 w-4" />
          </Button>
        </div>
      )}
    </div>
  );
}

