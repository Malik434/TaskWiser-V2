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
    <div className={`space-y-2 ${className}`}>
      <Label className="text-xs font-semibold uppercase text-muted-foreground">
        {label}
      </Label>
      <div className="relative">
        <Input
          placeholder={placeholder}
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="w-full"
        />
        <div
          className={`absolute z-10 mt-1 w-full rounded-md border bg-popover shadow-md ${
            searchQuery ? "block" : "hidden"
          }`}
        >
          <div className="max-h-60 overflow-auto p-1">
            <div
              className="flex items-center gap-2 rounded-sm px-2 py-1.5 text-sm cursor-pointer hover:bg-accent"
              onClick={() => {
                onSelectUser(undefined);
                setSearchQuery("");
              }}
            >
              <User className="h-4 w-4" />
              <span>{emptyLabel}</span>
            </div>
            {isLoadingUsers ? (
              <div className="flex items-center justify-center p-2">
                <Loader2 className="h-4 w-4 animate-spin" />
              </div>
            ) : (
              getFilteredUsers(availableUsers, searchQuery).map((user) => (
                <div
                  key={user.id}
                  className="flex items-center gap-2 rounded-sm px-2 py-1.5 text-sm cursor-pointer hover:bg-accent"
                  onClick={() => {
                    onSelectUser(user.id);
                    setSearchQuery("");
                  }}
                >
                  <Avatar className="h-6 w-6">
                    <AvatarImage
                      src={user.profilePicture || "/placeholder.svg"}
                      alt={user.username}
                    />
                    <AvatarFallback>
                      {user.username.substring(0, 2)}
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex flex-col">
                    <span>{user.username}</span>
                    <span className="text-xs text-muted-foreground">
                      {user.address.substring(0, 10)}...
                    </span>
                  </div>
                </div>
              ))
            )}
            {searchQuery &&
              getFilteredUsers(availableUsers, searchQuery).length === 0 && (
                <div className="px-2 py-1.5 text-sm text-muted-foreground">
                  No users found
                </div>
              )}
          </div>
        </div>
      </div>
      {selectedUser && (
        <div className="flex items-center gap-2 mt-2">
          <Avatar className="h-6 w-6">
            <AvatarImage
              src={selectedUser.profilePicture || "/placeholder.svg"}
              alt={selectedUser.username}
            />
            <AvatarFallback>
              {selectedUser.username?.substring(0, 2) || "UN"}
            </AvatarFallback>
          </Avatar>
          <span className="text-sm">{selectedUser.username || "Unknown User"}</span>
          <Button
            variant="ghost"
            size="sm"
            className="h-6 w-6 p-0 rounded-full ml-auto"
            onClick={() => onSelectUser(undefined)}
          >
            <XCircle className="h-4 w-4" />
          </Button>
        </div>
      )}
    </div>
  );
}

