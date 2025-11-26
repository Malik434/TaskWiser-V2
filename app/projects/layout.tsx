"use client";

import { ProtectedRoute } from "@/components/protected-route";
import { Sidebar } from "@/components/sidebar";

export default function ProjectsLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <ProtectedRoute>
      <div className="flex h-screen dark-container">
        <Sidebar />
        <div className="flex-1 overflow-auto">
          {children}
        </div>
      </div>
    </ProtectedRoute>
  );
}

