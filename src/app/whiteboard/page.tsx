'use client';

import { useState, useEffect } from 'react';
import dynamic from 'next/dynamic';
import { Sidebar } from '@/components/Sidebar';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarImage } from '@/components/ui/avatar';
import { Share, Download, Trash2 } from 'lucide-react';
import '@excalidraw/excalidraw/index.css';

// Dynamically import Excalidraw to avoid SSR issues
const Excalidraw = dynamic(
  async () => {
    const mod = await import('@excalidraw/excalidraw');
    return mod.Excalidraw;
  },
  {
    ssr: false,
    loading: () => (
      <div className="flex items-center justify-center h-full w-full">
        <div className="text-gray-500">Loading whiteboard...</div>
      </div>
    ),
  }
);

export default function WhiteboardPage() {
  const [currentView, setCurrentView] = useState("whiteboard");
  const [mounted, setMounted] = useState(false);
  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) {
    return (
      <div className="flex h-screen w-full bg-white overflow-hidden items-center justify-center">
        <div className="text-gray-500">Loading...</div>
      </div>
    );
  }

  return (
    <div className="flex h-screen w-full bg-white overflow-hidden">
      <Sidebar currentView={currentView} onViewChange={setCurrentView} />

      <div className="flex-1 flex flex-col min-h-0">
        {/* Header */}
        <header className="flex items-center justify-between p-4 border-b bg-white z-10 flex-shrink-0">
          <div className="flex items-center gap-4">
            <h1 className="text-xl font-semibold text-gray-800">Collaborative Whiteboard</h1>
            <span className="text-sm text-gray-500">Powered by Excalidraw</span>
          </div>

          <div className="flex items-center gap-3">
            <div className="flex -space-x-2">
              <Avatar className="w-8 h-8 border-2 border-white">
                <AvatarImage src="https://i.pravatar.cc/150?u=a" />
              </Avatar>
              <Avatar className="w-8 h-8 border-2 border-white">
                <AvatarImage src="https://i.pravatar.cc/150?u=b" />
              </Avatar>
            </div>

            <Button variant="outline" size="sm">
              <Download className="w-4 h-4 mr-2" />
              Export
            </Button>

            <Button variant="outline" size="sm">
              <Trash2 className="w-4 h-4 mr-2" />
              Clear
            </Button>

            <Button size="sm" className="bg-primary text-primary-foreground">
              <Share className="w-4 h-4 mr-2" />
              Share
            </Button>
          </div>
        </header>

        {/* Excalidraw Canvas */}
        <div className="flex-1 min-h-0" style={{ height: 'calc(100vh - 80px)' }}>
          <Excalidraw
            theme="light"
            initialData={{
              appState: {
                viewBackgroundColor: "#ffffff",
                currentItemFontFamily: 1,
              },
            }}
          />
        </div>
      </div>
    </div>
  );
}
