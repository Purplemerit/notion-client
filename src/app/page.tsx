'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Sidebar } from "@/components/Sidebar";
import { TopNavigation } from "@/components/TopNavigation";
import { ProjectList } from "@/components/ProjectList";
import { useAuth } from '@/contexts/AuthContext';

export default function Dashboard() {
  const router = useRouter();
  const { user, loading: authLoading, isAuthenticated } = useAuth();
  const [currentView, setCurrentView] = useState("dashboard");

  useEffect(() => {
    // Wait for auth to load
    if (authLoading) return;
    
    // If not authenticated, redirect to login
    if (!isAuthenticated) {
      router.push('/login');
    }
  }, [isAuthenticated, authLoading, router]);

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
      router.push("/tasks");
    } else {
      setCurrentView(view);
    }
  };

  if (authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-xl">Loading...</div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return null;
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-50 to-purple-100 flex">
      <Sidebar currentView={currentView} onViewChange={handleViewChange} />

      <div className="flex-1 flex flex-col">
        <TopNavigation />

        {/* The p-6 class has been removed from this main element */}
        <main className="flex-1">
          {(currentView === "dashboard" || currentView === "home") && (
            <ProjectList />
          )}
        </main>
      </div>
    </div>
  );
}
