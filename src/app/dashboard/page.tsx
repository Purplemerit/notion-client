'use client';

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Sidebar } from "@/components/Sidebar";
import { TopNavigation } from "@/components/TopNavigation";
import { ProjectList } from "@/components/ProjectList";
import { useTheme } from '@/contexts/ThemeContext'
export default function DashboardPage() {
  const [currentView, setCurrentView] = useState("dashboard");
  const router = useRouter();

  const handleViewChange = (view: string) => {
    if (view === "chat") {
      router.push("/chat");
    } else if (view === "settings") {
      router.push("/settings");
    } else if (view === "community") {
      router.push("/community");
    } else if (view === "meeting") {
      router.push("/meeting");
    } else if (view === "task") {
      router.push("/task");
    } else {
      setCurrentView(view);
    }
  };
const {  actualTheme } = useTheme();
  return (
   <div
  className={`min-h-screen flex ${
    actualTheme === "dark"
      ? "bg-gray-900"
      : "bg-white"
  }`}
>

      <Sidebar currentView={currentView} onViewChange={handleViewChange} />

      <div className="flex-1 flex flex-col ">
        <TopNavigation />

        {/* The p-6 class has been removed from this main element */}
        <main className="flex-1 ">
          {(currentView === "dashboard" || currentView === "home") && (
            <ProjectList />
          )}
        </main>
      </div>
    </div>
  );
}
