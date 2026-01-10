"use client";

import { useState, useEffect, useRef } from "react";
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
  Menu,
  X,
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
  const [mobileOpen, setMobileOpen] = useState(false);
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [profilePictureError, setProfilePictureError] = useState(false);
  
  // Track the last fetched account to prevent redundant fetches
  const lastFetchedAccountRef = useRef<string | null>(null);
  const isFetchingRef = useRef(false);

  useEffect(() => {
    if (typeof window !== "undefined") {
      window.localStorage.setItem("sidebar-collapsed", String(collapsed));
    }
  }, [collapsed]);

  useEffect(() => {
    // Only fetch if account changed and we haven't fetched for this account yet
    if (account && account !== lastFetchedAccountRef.current && !isFetchingRef.current) {
      isFetchingRef.current = true;
      fetchUserProfile(account).finally(() => {
        isFetchingRef.current = false;
      });
    } else if (!account) {
      // Clear profile when account disconnects
      setUserProfile(null);
      lastFetchedAccountRef.current = null;
    }
  }, [account]);

  const fetchUserProfile = async (address: string) => {
    try {
      const profile = await getUserProfile(address);
      if (profile) {
        setUserProfile(profile);
        lastFetchedAccountRef.current = address;
      }
    } catch (error) {
      console.error("Error fetching user profile:", error);
      lastFetchedAccountRef.current = address; // Mark as attempted even on error
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
    <>
      {/* Mobile Menu Button */}
      <Button
        variant="ghost"
        size="icon"
        className="fixed left-4 top-4 z-50 md:hidden h-10 w-10 bg-white/80 backdrop-blur-sm border border-slate-200 shadow-lg hover:bg-white dark:bg-slate-900/80 dark:border-slate-700 dark:hover:bg-slate-800 transition-all"
        onClick={() => setMobileOpen(!mobileOpen)}
        aria-label={mobileOpen ? "Close menu" : "Open menu"}
        title={mobileOpen ? "Close menu" : "Open menu"}
      >
        {mobileOpen ? (
          <X className="h-5 w-5 text-slate-600 dark:text-slate-400" />
        ) : (
          <Menu className="h-5 w-5 text-slate-600 dark:text-slate-400" />
        )}
      </Button>

      {/* Mobile Overlay */}
      {mobileOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/50 md:hidden"
          onClick={() => setMobileOpen(false)}
        />
      )}

      {/* Sidebar */}
      <div
        className={cn(
          "relative flex h-full flex-col transition-all duration-300 ease-in-out",
          "bg-gradient-to-b from-slate-50 to-white dark:from-slate-950 dark:to-slate-900",
          "border-r border-slate-200 dark:border-slate-800",
          "shadow-xl backdrop-blur-sm",
          // Mobile styles
          "fixed inset-y-0 left-0 z-40 md:relative",
          "transform md:transform-none",
          mobileOpen ? "translate-x-0" : "-translate-x-full md:translate-x-0",
          // Desktop styles
          collapsed ? "md:w-20" : "md:w-64",
          "w-64"
        )}
      >
        <Button
          variant="ghost"
          size="icon"
          className="absolute -right-4 top-20 z-10 h-8 w-8 rounded-full border border-slate-200 bg-white/80 backdrop-blur-sm shadow-lg hover:bg-white dark:bg-slate-900/80 dark:border-slate-700 dark:hover:bg-slate-800 hidden md:flex transition-all"
          onClick={() => setCollapsed(!collapsed)}
        >
          {collapsed ? (
            <ChevronRight className="h-4 w-4 text-slate-600 dark:text-slate-400" />
          ) : (
            <ChevronLeft className="h-4 w-4 text-slate-600 dark:text-slate-400" />
          )}
        </Button>

      <div
        className={cn(
          "flex h-16 items-center pr-4 pl-16 md:px-4",
          "justify-start md:justify-start",
          "border-b border-slate-200 dark:border-slate-800",
          collapsed && "md:justify-center"
        )}
      >
        <Link
          href="/"
          onClick={() => setMobileOpen(false)}
          className={cn(
            "flex items-center gap-2",
            "justify-start md:justify-start",
            collapsed && "md:justify-center"
          )}
        >
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-indigo-500 to-fuchsia-500 shadow-lg flex-shrink-0">
            <Home className="h-5 w-5 text-white" />
          </div>
          <span className={cn("text-lg font-semibold bg-gradient-to-r from-indigo-600 to-purple-600 dark:from-indigo-400 dark:to-purple-400 bg-clip-text text-transparent", collapsed && "md:hidden")}>
            Task Wiser
          </span>
        </Link>
      </div>

      <div className="flex-1 overflow-auto py-4">
        <nav className={cn("space-y-2", collapsed ? "md:px-1" : "md:px-3", "px-3")}>
          {navigation.map((item) => {
            const isActive = pathname === item.href;
            return (
              <Link
                key={item.name}
                href={item.href}
                onClick={() => setMobileOpen(false)}
                className={cn(
                  "group flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-all duration-200",
                  "justify-start md:justify-start",
                  collapsed && "md:justify-center",
                  isActive
                    ? "bg-gradient-to-r from-indigo-500 to-purple-500 text-white shadow-lg shadow-indigo-500/30"
                    : "text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800/50 hover:text-indigo-600 dark:hover:text-indigo-400"
                )}
              >
                <div className={cn(
                  "flex h-8 w-8 items-center justify-center rounded-lg flex-shrink-0 transition-all",
                  isActive 
                    ? "bg-white/20" 
                    : "bg-slate-100 dark:bg-slate-800 group-hover:bg-indigo-100 dark:group-hover:bg-indigo-900/30"
                )}>
                  <item.icon className={cn(
                    "h-4 w-4 transition-colors",
                    isActive ? "text-white" : "text-slate-600 dark:text-slate-400 group-hover:text-indigo-600 dark:group-hover:text-indigo-400"
                  )} />
                </div>
                <span className={cn(collapsed && "md:hidden")}>{item.name}</span>
                {collapsed && (
                  <span className="absolute left-full ml-2 w-auto min-w-max rounded-xl bg-slate-900 dark:bg-slate-800 px-3 py-1.5 text-xs font-medium text-white opacity-0 shadow-xl transition-opacity group-hover:opacity-100 z-50 hidden md:block border border-slate-700">
                    {item.name}
                  </span>
                )}
              </Link>
            );
          })}
        </nav>
      </div>

      <div
        className={cn(
          "flex items-center gap-3 border-t border-slate-200 dark:border-slate-800 p-4",
          "bg-gradient-to-r from-slate-50 to-white dark:from-slate-900 dark:to-slate-950",
          "justify-start md:justify-start",
          collapsed && "md:justify-center"
        )}
      >
        <Avatar className="h-10 w-10 flex-shrink-0 ring-2 ring-slate-200 dark:ring-slate-700 shadow-md">
          {userProfile?.profilePicture && !profilePictureError ? (
            <AvatarImage
              src={userProfile.profilePicture || "/placeholder.svg"}
              alt={userProfile.username}
              onError={handleProfilePictureError}
            />
          ) : (
            <AvatarFallback className="bg-gradient-to-br from-indigo-500 to-purple-500 text-white font-semibold">
              {userProfile?.username 
                ? userProfile.username.substring(0, 2).toUpperCase()
                : account 
                  ? account.substring(2, 4).toUpperCase() 
                  : "U"}
            </AvatarFallback>
          )}
        </Avatar>
        <div className={cn("flex-1 truncate min-w-0", collapsed && "md:hidden")}>
          <div className="text-sm font-semibold text-slate-900 dark:text-slate-50 truncate">
            {userProfile?.username ||
              (account ? shortenAddress(account) : "Not connected")}
          </div>
          {userProfile?.username && account && (
            <div className="text-xs text-slate-500 dark:text-slate-400 truncate">
              {shortenAddress(account)}
            </div>
          )}
        </div>
      </div>
    </div>
    </>
  );
}