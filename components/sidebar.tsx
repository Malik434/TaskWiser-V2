"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Home,
  Kanban,
  User,
  ChevronLeft,
  ChevronRight,
  LayoutDashboard,
  Telescope,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { useWeb3 } from "./web3-provider";
import { useFirebase } from "./firebase-provider";
import type { UserProfile } from "@/lib/types";

export function Sidebar() {
  const pathname = usePathname();
  const { account } = useWeb3();
  const { getUserProfile } = useFirebase();
  const [collapsed, setCollapsed] = useState<boolean>(() => {
    if (typeof window !== "undefined") {
      const stored = window.localStorage.getItem("sidebar-collapsed");
      if (stored !== null) {
        return stored === "true";
      }
    }
    return false;
  });
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [profilePictureError, setProfilePictureError] = useState(false);

  useEffect(() => {
    if (typeof window !== "undefined") {
      window.localStorage.setItem("sidebar-collapsed", String(collapsed));
    }
  }, [collapsed]);

  useEffect(() => {
    if (account) {
      fetchUserProfile(account);
    }
  }, [account]);

  const fetchUserProfile = async (address: string) => {
    try {
      const profile = await getUserProfile(address);
      if (profile) {
        setUserProfile(profile);
      }
    } catch (error) {
      console.error("Error fetching user profile:", error);
    }
  };

  const handleProfilePictureError = () => {
    setProfilePictureError(true);
  };

  const shortenAddress = (address: string | null) => {
    if (!address) return "";
    return `${address.slice(0, 6)}...${address.slice(-4)}`;
  };

  const navigation = [
    { name: "Explore", href: "/explore", icon: Telescope },
    { name: "Projects", href: "/projects", icon: Kanban },
    { name: "Dashboard", href: "/dashboard", icon: LayoutDashboard },
    { name: "Profile", href: "/profile", icon: User },
  ];

  return (
    <div
      className={cn(
        "relative flex h-full flex-col transition-all duration-300 ease-in-out",
        "bg-sidebar text-sidebar-foreground shadow-md dark:bg-gray-900 dark:border-r dark:border-gray-800",
        collapsed ? "w-20" : "w-64"
      )}
    >
      <Button
        variant="ghost"
        size="icon"
        className="absolute -right-4 top-20 z-10 h-8 w-8 rounded-full border bg-background shadow-md dark:bg-gray-800 dark:border-gray-700"
        onClick={() => setCollapsed(!collapsed)}
      >
        {collapsed ? (
          <ChevronRight className="h-4 w-4" />
        ) : (
          <ChevronLeft className="h-4 w-4" />
        )}
      </Button>

      <div
        className={cn(
          "flex h-16 items-center px-4",
          collapsed ? "justify-center" : "justify-start"
        )}
      >
        <Link
          href="/"
          className={cn(
            "flex items-center gap-2",
            collapsed && "justify-center"
          )}
        >
          <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary">
            <Home className="h-5 w-5 text-white" />
          </div>
          {!collapsed && (
            <span className="text-lg font-semibold">Task Wiser</span>
          )}
        </Link>
      </div>

      <div className="flex-1 overflow-auto py-2">
        <nav className={cn("space-y-1", collapsed ? "px-1" : "px-2")}>
          {navigation.map((item) => (
            <Link
              key={item.name}
              href={item.href}
              className={cn(
                "group flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors",
                collapsed ? "justify-center" : "justify-start",
                pathname === item.href
                  ? "bg-primary/10 text-primary dark:bg-primary/20 dark:text-white"
                  : "text-sidebar-foreground/80 hover:bg-primary/5 hover:text-primary dark:text-gray-300 dark:hover:bg-gray-800 dark:hover:text-white"
              )}
            >
              <item.icon className="h-5 w-5 flex-shrink-0" />
              {!collapsed && <span>{item.name}</span>}
              {collapsed && (
                <span className="absolute left-full ml-2 w-auto min-w-max rounded-md bg-black px-2 py-1 text-xs font-medium text-white opacity-0 shadow-md transition-opacity group-hover:opacity-100 z-50">
                  {item.name}
                </span>
              )}
            </Link>
          ))}
        </nav>
      </div>

      <div
        className={cn(
          "flex items-center gap-2 border-t p-4 dark:border-gray-800",
          collapsed ? "justify-center" : "justify-start"
        )}
      >
        <Avatar className="h-8 w-8">
          {userProfile?.profilePicture && !profilePictureError ? (
            <AvatarImage
              src={userProfile.profilePicture || "/placeholder.svg"}
              alt={userProfile.username}
              onError={handleProfilePictureError}
            />
          ) : (
            <AvatarFallback>
              {account ? account.substring(2, 4).toUpperCase() : "U"}
            </AvatarFallback>
          )}
        </Avatar>
        {!collapsed && (
          <div className="flex-1 truncate">
            <div className="text-sm font-medium">
              {userProfile?.username ||
                (account ? shortenAddress(account) : "Not connected")}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
