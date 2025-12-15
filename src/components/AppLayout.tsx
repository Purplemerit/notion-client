"use client";

import { ReactNode } from "react";
import { Sidebar } from "./Sidebar";
import { TopNavigation } from "./TopNavigation";
import { useTheme } from "@/contexts/ThemeContext";

interface AppLayoutProps {
  children: ReactNode;
}

export const AppLayout = ({ children }: AppLayoutProps) => {
  const { actualTheme } = useTheme();

  return (
    <div className={`min-h-screen flex ${
      actualTheme === 'dark' 
        ? 'bg-gradient-to-br from-gray-900 to-gray-800' 
        : 'bg-gradient-to-br from-purple-50 to-purple-100'
    }`}>
      <Sidebar />
      <div className="flex-1 flex flex-col">
        <TopNavigation />
        <main className={`flex-1 overflow-y-auto ${
          actualTheme === 'dark' ? 'bg-gray-900' : 'bg-slate-50'
        }`}>
          {children}
        </main>
      </div>
    </div>
  );
};
